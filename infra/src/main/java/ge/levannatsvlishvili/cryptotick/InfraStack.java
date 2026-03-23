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

        userPool.addClient("CryptoTickWebClient", UserPoolClientOptions.builder()
                .authFlows(AuthFlow.builder().userPassword(true).build())
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

        Function analyticsLambda = Function.Builder.create(this, "AnalyticsLambda")
                .runtime(Runtime.JAVA_17)
                .handler("ge.levannatsvlishvili.cryptotick.AnalyticsHandler")
                .code(Code.fromAsset("../services/analytics-service/target/analytics-service-1.0-SNAPSHOT.jar"))
                .timeout(Duration.seconds(30))
                .memorySize(512)
                .build();

        ingestionQueue.grantConsumeMessages(analyticsLambda);
        alertsTable.grantWriteData(analyticsLambda);

        analyticsLambda.addEventSource(new software.amazon.awscdk.services.lambda.eventsources.SqsEventSource(ingestionQueue));
    }
}