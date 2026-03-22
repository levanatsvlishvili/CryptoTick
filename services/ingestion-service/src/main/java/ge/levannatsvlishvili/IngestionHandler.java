package ge.levannatsvlishvili;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class IngestionHandler implements RequestHandler<Object, String> {
    private final SqsClient sqsClient = SqsClient.builder().build();
    private final String queueUrl = System.getenv("QUEUE_URL");
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Override
    public String handleRequest(Object input, Context context) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            String priceData = response.body();

            sqsClient.sendMessage(SendMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .messageBody(priceData)
                    .build());

            return "Price sent to SQS: " + priceData;
        } catch (Exception e) {
            context.getLogger().log("Error: " + e.getMessage());
            return "Failed";
        }
    }
}