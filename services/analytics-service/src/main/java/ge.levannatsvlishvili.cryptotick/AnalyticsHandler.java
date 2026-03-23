package ge.levannatsvlishvili.cryptotick;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.Map;

public class AnalyticsHandler implements RequestHandler<SQSEvent, String> {
    private final ObjectMapper mapper = new ObjectMapper();
    private final DynamoDbClient dynamoDb = DynamoDbClient.builder().build();
    private final String TABLE_NAME = "CryptoTick_Alerts";

    private static final double THRESHOLD = 0.001;
    private static double lastPrice = 0;

    @Override
    public String handleRequest(SQSEvent event, Context context) {
        for (SQSEvent.SQSMessage msg : event.getRecords()) {
            try {
                JsonNode root = mapper.readTree(msg.getBody());
                double currentPrice = root.get("price").asDouble();
                String symbol = root.get("symbol").asText();

                context.getLogger().log("Processing " + symbol + ": " + currentPrice);

                if (shouldAlert(currentPrice)) {
                    saveAlert(symbol, currentPrice);
                    context.getLogger().log("!!! ALERT SAVED: Significant price movement detected !!!");
                }

                lastPrice = currentPrice;

            } catch (Exception e) {
                context.getLogger().log("Error: " + e.getMessage());
            }
        }
        return "Success";
    }

    private boolean shouldAlert(double currentPrice) {
        if (lastPrice == 0) return true;
        double change = Math.abs(currentPrice - lastPrice) / lastPrice;
        return change >= THRESHOLD;
    }

    private void saveAlert(String symbol, double price) {
        dynamoDb.putItem(PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(Map.of(
                        "symbol", AttributeValue.builder().s(symbol).build(),
                        "timestamp", AttributeValue.builder().n(String.valueOf(System.currentTimeMillis())).build(),
                        "price", AttributeValue.builder().n(String.valueOf(price)).build(),
                        "type", AttributeValue.builder().s("VOLATILITY_ALERT").build()
                ))
                .build());
    }
}