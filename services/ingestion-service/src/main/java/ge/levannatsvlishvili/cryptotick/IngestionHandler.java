package ge.levannatsvlishvili.cryptotick;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageBatchRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageBatchRequestEntry;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class IngestionHandler implements RequestHandler<Object, String> {
    private final SqsClient sqsClient = SqsClient.builder().build();
    private final String queueUrl = System.getenv("QUEUE_URL");
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public String handleRequest(Object input, Context context) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.binance.com/api/v3/ticker/price"))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode allTickers = mapper.readTree(response.body());

            List<SendMessageBatchRequestEntry> entries = new ArrayList<>();
            int count = 0;

            for (JsonNode ticker : allTickers) {
                String symbol = ticker.get("symbol").asText();
                if (symbol.endsWith("USDT") && count < 20) {
                    entries.add(SendMessageBatchRequestEntry.builder()
                            .id(UUID.randomUUID().toString())
                            .messageBody(ticker.toString())
                            .build());
                    count++;
                }
            }

            for (int i = 0; i < entries.size(); i += 10) {
                int toIndex = Math.min(i + 10, entries.size());
                List<SendMessageBatchRequestEntry> batch = entries.subList(i, toIndex);

                sqsClient.sendMessageBatch(SendMessageBatchRequest.builder()
                        .queueUrl(queueUrl)
                        .entries(batch)
                        .build());
            }

            return "Successfully ingested " + count + " symbols in batches of 10";
        } catch (Exception e) {
            context.getLogger().log("Ingestion Error: " + e.getMessage());
            return "Failed";
        }
    }
}