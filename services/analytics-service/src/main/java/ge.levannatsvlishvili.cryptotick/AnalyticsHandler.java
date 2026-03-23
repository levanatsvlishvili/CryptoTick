package ge.levannatsvlishvili.cryptotick;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.Map;

public class AnalyticsHandler implements RequestHandler<SQSEvent, String> {
    private final ObjectMapper mapper = new ObjectMapper();
    private final DynamoDbClient dynamoDb = DynamoDbClient.builder().build();
    private final String TABLE_NAME = "CryptoTick_Alerts";

    @Override
    public String handleRequest(SQSEvent event, Context context) {
        for (SQSEvent.SQSMessage msg : event.getRecords()) {
            try {
                JsonNode root = mapper.readTree(msg.getBody());
                double currentPrice = root.get("price").asDouble();
                String symbol = root.get("symbol").asText();

                if (currentPrice > 0) { 
                    saveAlert(symbol, currentPrice);
                }
            } catch (Exception e) {
                context.getLogger().log("Error processing message: " + e.getMessage());
            }
        }
        return "Processed " + event.getRecords().size() + " messages";
    }

    private void saveAlert(String symbol, double price) {
        dynamoDb.putItem(PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(Map.of(
                        "symbol", AttributeValue.builder().s(symbol).build(),
                        "timestamp", AttributeValue.builder().n(String.valueOf(System.currentTimeMillis())).build(),
                        "price", AttributeValue.builder().n(String.valueOf(price)).build()
                ))
                .build());
    }
}