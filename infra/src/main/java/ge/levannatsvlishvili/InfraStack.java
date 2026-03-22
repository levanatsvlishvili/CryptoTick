package ge.levannatsvlishvili;

import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.cognito.*;
import software.amazon.awscdk.services.dynamodb.*;
import software.amazon.awscdk.services.sqs.Queue;
import software.amazon.awscdk.Duration;
import software.constructs.Construct;

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
    }
}