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

import java.util.Arrays;
import java.util.List;
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
        ScanResponse settingsResponse = dynamoDb.scan(ScanRequest.builder().tableName(SETTINGS_TABLE).build());
        List<Map<String, AttributeValue>> allUserSettings = settingsResponse.items();

        for (SQSEvent.SQSMessage msg : event.getRecords()) {
            try {
                JsonNode root = mapper.readTree(msg.getBody());
                double currentPrice = root.get("price").asDouble();
                String symbol = root.get("symbol").asText();

                double previousPrice = lastPrices.getOrDefault(symbol, currentPrice);
                double change = Math.abs(currentPrice - previousPrice) / previousPrice;

                for (Map<String, AttributeValue> userPref : allUserSettings) {
                    String userId = userPref.get("userId").s();
                    double thresholdPercent = Double.parseDouble(userPref.get("threshold").n());
                    double thresholdDecimal = thresholdPercent / 100.0;

                    String trackedSymbolsStr = userPref.get("trackedSymbols") != null ? userPref.get("trackedSymbols").s() : "";
                    List<String> trackedList = Arrays.asList(trackedSymbolsStr.split("\\s*,\\s*"));

                    if (trackedSymbolsStr.isEmpty() || trackedList.contains(symbol)) {
                        saveToDynamo(symbol, currentPrice, previousPrice, userId);

                        if (change >= thresholdDecimal && currentPrice != previousPrice) {
                            sendSnsNotification(symbol, currentPrice, thresholdPercent);
                            context.getLogger().log("!!! Alert triggered for " + userId + " on " + symbol + " at " + thresholdPercent + "%");
                        }
                    }
                }
                lastPrices.put(symbol, currentPrice);
            } catch (Exception e) {
                context.getLogger().log("Error: " + e.getMessage());
            }
        }
        return "Success";
    }

    private void saveToDynamo(String symbol, double price, double oldPrice, String userId) {
        dynamoDb.putItem(PutItemRequest.builder()
                .tableName(ALERTS_TABLE)
                .item(Map.of(
                        "userId", AttributeValue.builder().s(userId).build(),
                        "symbol", AttributeValue.builder().s(symbol).build(),
                        "timestamp", AttributeValue.builder().n(String.valueOf(System.currentTimeMillis())).build(),
                        "price", AttributeValue.builder().n(String.valueOf(price)).build(),
                        "oldPrice", AttributeValue.builder().n(String.valueOf(oldPrice)).build()
                ))
                .build());
    }

    private void sendSnsNotification(String symbol, double price, double threshold) {
        String message = String.format("CryptoTick Alert! %s movement detected (>%.2f%%). Current Price: $%.2f",
                symbol, threshold, price);
        snsClient.publish(PublishRequest.builder()
                .topicArn(SNS_TOPIC_ARN)
                .subject("CryptoTick Volatility Alert")
                .message(message)
                .build());
    }
}