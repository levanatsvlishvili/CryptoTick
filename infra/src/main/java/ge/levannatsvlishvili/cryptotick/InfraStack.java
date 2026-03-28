package ge.levannatsvlishvili.cryptotick;

import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.cognito.*;
import software.amazon.awscdk.services.dynamodb.*;
import software.amazon.awscdk.services.lambda.*;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.sqs.Queue;
import software.amazon.awscdk.services.events.*;
import software.amazon.awscdk.services.events.targets.LambdaFunction;
import software.amazon.awscdk.Duration;
import software.constructs.Construct;
import software.amazon.awscdk.services.sns.*;
import software.amazon.awscdk.services.sns.subscriptions.*;
import software.amazon.awscdk.services.apigateway.*;
import software.amazon.awscdk.services.apigateway.*;

import java.util.List;
import java.util.Map;

public class InfraStack extends Stack {
    public InfraStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

        Queue ingestionQueue = Queue.Builder.create(this, "CryptoTickQueue")
                .queueName("CryptoTick_Ingestion_Queue")
                .visibilityTimeout(Duration.seconds(300))
                .build();

        Table alertsTable = Table.Builder.create(this, "CryptoAlertsTable")
                .tableName("CryptoTick_Alerts")
                .partitionKey(Attribute.builder().name("symbol").type(AttributeType.STRING).build())
                .sortKey(Attribute.builder().name("timestamp").type(AttributeType.NUMBER).build())
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        UserPool userPool = UserPool.Builder.create(this, "CryptoTickUserPool")
                .userPoolName("CryptoTick-Users")
                .selfSignUpEnabled(true)
                .signInAliases(SignInAliases.builder().email(true).build())
                .userVerification(UserVerificationConfig.builder().emailStyle(VerificationEmailStyle.CODE).build())
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        UserPoolClient webClient = userPool.addClient("CryptoTickWebClient", UserPoolClientOptions.builder()
                .userPoolClientName("CryptoTickWebClient")
                .generateSecret(false)
                .authFlows(AuthFlow.builder()
                        .userPassword(true)
                        .build())
                .oAuth(OAuthSettings.builder()
                        .flows(OAuthFlows.builder()
                                .implicitCodeGrant(true)
                                .build())
                        .scopes(List.of(OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE))
                        .callbackUrls(List.of("https://oauth.pstmn.io/v1/callback"))
                        .build())
                .supportedIdentityProviders(List.of(UserPoolClientIdentityProvider.COGNITO))
                .build());

        userPool.addDomain("CryptoTickDomain", UserPoolDomainOptions.builder()
                .cognitoDomain(CognitoDomainOptions.builder()
                        .domainPrefix("cryptotick-levan-auth-" + System.currentTimeMillis() / 10000)
                        .build())
                .build());

        Function ingestionLambda = Function.Builder.create(this, "IngestionLambda")
                .runtime(Runtime.JAVA_17)
                .handler("ge.levannatsvlishvili.cryptotick.IngestionHandler")
                .code(Code.fromAsset("../services/ingestion-service/target/ingestion-service-1.0-SNAPSHOT.jar"))
                .timeout(Duration.seconds(30))
                .memorySize(512)
                .environment(Map.of("QUEUE_URL", ingestionQueue.getQueueUrl()))
                .build();

        ingestionQueue.grantSendMessages(ingestionLambda);

        Rule eventRule = Rule.Builder.create(this, "IngestionSchedule")
                .schedule(Schedule.expression("rate(1 minute)"))
                .build();
        eventRule.addTarget(new LambdaFunction(ingestionLambda));

        Topic alertTopic = Topic.Builder.create(this, "CryptoAlertTopic")
                .topicName("CryptoTick_Alerts_Topic")
                .build();

        alertTopic.addSubscription(new EmailSubscription("levan.natsvlishvili3@gmail.com"));

        Table userSettingsTable = Table.Builder.create(this, "CryptoUserSettingsTable")
                .tableName("CryptoTick_UserSettings")
                .partitionKey(Attribute.builder().name("userId").type(AttributeType.STRING).build())
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        Function analyticsLambda = Function.Builder.create(this, "AnalyticsLambda")
                .runtime(Runtime.JAVA_17)
                .handler("ge.levannatsvlishvili.cryptotick.AnalyticsHandler")
                .code(Code.fromAsset("../services/analytics-service/target/analytics-service-1.0-SNAPSHOT.jar"))
                .timeout(Duration.seconds(30))
                .memorySize(512)
                .environment(Map.of(
                        "SNS_TOPIC_ARN", alertTopic.getTopicArn(),
                        "USER_SETTINGS_TABLE", userSettingsTable.getTableName() // დაამატე ეს ხაზი
                ))
                .build();

        ingestionQueue.grantConsumeMessages(analyticsLambda);
        alertsTable.grantWriteData(analyticsLambda);

        analyticsLambda.addEventSource(new software.amazon.awscdk.services.lambda.eventsources.SqsEventSource(ingestionQueue));

        alertTopic.grantPublish(analyticsLambda);

        Function getAlertsLambda = Function.Builder.create(this, "GetAlertsLambda")
                .runtime(Runtime.JAVA_17)
                .handler("ge.levannatsvlishvili.cryptotick.GetAlertsHandler")
                .code(Code.fromAsset("../services/api-service/target/api-service-1.0-SNAPSHOT.jar"))
                .memorySize(512)
                .timeout(Duration.seconds(20))
                .build();

        alertsTable.grantReadData(getAlertsLambda);

        CognitoUserPoolsAuthorizer authorizer = CognitoUserPoolsAuthorizer.Builder.create(this, "CryptoTickAuthorizer")
                .cognitoUserPools(List.of(userPool))
                .authorizerName("CryptoTick_Authorizer")
                .build();

        LambdaRestApi api = LambdaRestApi.Builder.create(this, "CryptoTickApi")
                .handler(getAlertsLambda)
                .proxy(true)
                .defaultCorsPreflightOptions(CorsOptions.builder()
                        .allowOrigins(Cors.ALL_ORIGINS)
                        .allowMethods(Cors.ALL_METHODS)
                        .build())
                .defaultMethodOptions(MethodOptions.builder()
                        .authorizer(authorizer)
                        .authorizationType(AuthorizationType.COGNITO)
                        .build())
                .build();

        userSettingsTable.grantReadData(analyticsLambda);
        userSettingsTable.grantReadWriteData(getAlertsLambda);
    }
}