package ge.levannatsvlishvili.cryptotick;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishRequest;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class AnalyticsHandler implements RequestHandler<SQSEvent, String> {
    private final ObjectMapper mapper = new ObjectMapper();
    private final DynamoDbClient dynamoDb = DynamoDbClient.builder().build();
    private final SnsClient snsClient = SnsClient.builder().build();

    private final String ALERTS_TABLE = "CryptoTick_Alerts";
    private final String SETTINGS_TABLE = System.getenv("USER_SETTINGS_TABLE");
    private final String SNS_TOPIC_ARN = System.getenv("SNS_TOPIC_ARN");

    private static final Map<String, Double> lastPrices = new ConcurrentHashMap<>();

    @Override
    public String handleRequest(SQSEvent event, Context context) {
        double userThreshold = getGlobalThreshold(context);

        for (SQSEvent.SQSMessage msg : event.getRecords()) {
            try {
                JsonNode root = mapper.readTree(msg.getBody());
                double currentPrice = root.get("price").asDouble();
                String symbol = root.get("symbol").asText();

                if (shouldAlert(symbol, currentPrice, userThreshold)) {
                    processAlert(symbol, currentPrice, userThreshold, context);
                }

                lastPrices.put(symbol, currentPrice);

            } catch (Exception e) {
                context.getLogger().log("Error: " + e.getMessage());
            }
        }
        return "Success";
    }

    private double getGlobalThreshold(Context context) {
        try {
            ScanResponse response = dynamoDb.scan(ScanRequest.builder().tableName(SETTINGS_TABLE).limit(1).build());
            if (!response.items().isEmpty()) {
                return Double.parseDouble(response.items().get(0).get("threshold").n());
            }
        } catch (Exception e) {
            context.getLogger().log("Settings not found, using default 0.1%");
        }
        return 0.001;
    }

    private boolean shouldAlert(String symbol, double currentPrice, double threshold) {
        if (!lastPrices.containsKey(symbol)) return true;
        double previousPrice = lastPrices.get(symbol);
        double change = Math.abs(currentPrice - previousPrice) / previousPrice;
        return change >= threshold;
    }

    private void processAlert(String symbol, double price, double threshold, Context context) {
        saveToDynamo(symbol, price);
        sendSnsNotification(symbol, price, threshold);
        context.getLogger().log("!!! ALERT: " + symbol + " changed more than " + (threshold * 100) + "% !!!");
    }

    private void saveToDynamo(String symbol, double price) {
        dynamoDb.putItem(PutItemRequest.builder()
                .tableName(ALERTS_TABLE)
                .item(Map.of(
                        "symbol", AttributeValue.builder().s(symbol).build(),
                        "timestamp", AttributeValue.builder().n(String.valueOf(System.currentTimeMillis())).build(),
                        "price", AttributeValue.builder().n(String.valueOf(price)).build(),
                        "type", AttributeValue.builder().s("DYNAMIC_VOLATILITY_ALERT").build()
                ))
                .build());
    }

    private void sendSnsNotification(String symbol, double price, double threshold) {
        String message = String.format("CryptoTick Alert! %s movement detected (>%.2f%%). Price: $%.2f",
                symbol, threshold * 100, price);
        snsClient.publish(PublishRequest.builder()
                .topicArn(SNS_TOPIC_ARN)
                .subject("CryptoTick Alert")
                .message(message)
                .build());
    }
}