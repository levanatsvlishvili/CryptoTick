package ge.levannatsvlishvili.cryptotick;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.*;
import java.util.stream.Collectors;

public class GetAlertsHandler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {
    private final DynamoDbClient dynamoDb = DynamoDbClient.builder().build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final String ALERTS_TABLE = "CryptoTick_Alerts";
    private final String SETTINGS_TABLE = "CryptoTick_UserSettings";

    private static final List<String> ALL_SYMBOLS = List.of(
            "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "AVAXUSDT", "DOTUSDT",
            "DOGEUSDT", "LINKUSDT", "MATICUSDT", "SHIBUSDT", "LTCUSDT", "TRXUSDT", "BCHUSDT",
            "UNIUSDT", "NEARUSDT", "APTUSDT", "OPUSDT", "ARBUSDT"
    );

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input, Context context) {
        try {
            Map<String, Object> authorizer = input.getRequestContext().getAuthorizer();
            Map<String, Object> claims = (Map<String, Object>) authorizer.get("claims");
            String userId = (String) claims.get("sub");
            String email = (String) claims.get("email");

            String method = input.getHttpMethod();
            if ("GET".equalsIgnoreCase(method)) {
                return handleGetCombinedData(userId, email);
            } else if ("POST".equalsIgnoreCase(method)) {
                return handleSaveSettings(input, userId, email);
            }
            return createResponse(405, "{\"error\":\"Method Not Allowed\"}");
        } catch (Exception e) {
            return createResponse(500, "{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    private APIGatewayProxyResponseEvent handleGetCombinedData(String userId, String email) throws Exception {
        GetItemResponse settingsResp = dynamoDb.getItem(GetItemRequest.builder()
                .tableName(SETTINGS_TABLE)
                .key(Map.of("userId", AttributeValue.builder().s(userId).build()))
                .build());

        Map<String, String> userSettings = new HashMap<>();
        if (settingsResp.hasItem()) {
            settingsResp.item().forEach((k, v) -> userSettings.put(k, v.s() != null ? v.s() : v.n()));
        } else {
            userSettings.put("userId", userId);
            if (email != null) userSettings.put("email", email);
            userSettings.put("threshold", "0.1");
            userSettings.put("trackedSymbols", "BTCUSDT, ETHUSDT");
        }

        List<Map<String, String>> alerts = ALL_SYMBOLS.parallelStream()
                .flatMap(symbol -> fetchRecentTicks(symbol, 200).stream())
                .sorted((a, b) -> Long.compare(Long.parseLong(b.get("timestamp")), Long.parseLong(a.get("timestamp"))))
                .collect(Collectors.toList());

        Map<String, Object> responseMap = new HashMap<>();
        responseMap.put("alerts", alerts);
        responseMap.put("settings", userSettings);

        return createResponse(200, mapper.writeValueAsString(responseMap));
    }

    private List<Map<String, String>> fetchRecentTicks(String symbol, int limit) {
        try {
            QueryResponse queryResp = dynamoDb.query(QueryRequest.builder()
                    .tableName(ALERTS_TABLE)
                    .keyConditionExpression("symbol = :sym")
                    .expressionAttributeValues(Map.of(":sym", AttributeValue.builder().s(symbol).build()))
                    .scanIndexForward(false)
                    .limit(limit)
                    .build());

            List<Map<String, String>> results = new ArrayList<>();
            long lastTimestamp = Long.MAX_VALUE;

            for (Map<String, AttributeValue> item : queryResp.items()) {
                if (item.get("timestamp") == null || item.get("price") == null) continue;
                long ts = Long.parseLong(item.get("timestamp").n());

                // Deduplicate consecutive records within 30 seconds for the same symbol
                if (Math.abs(lastTimestamp - ts) < 30_000) {
                    continue;
                }
                lastTimestamp = ts;

                Map<String, String> map = new HashMap<>();
                item.forEach((k, v) -> map.put(k, v.s() != null ? v.s() : v.n()));
                results.add(map);
            }
            return results;
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private APIGatewayProxyResponseEvent handleSaveSettings(APIGatewayProxyRequestEvent input, String userId, String email) throws Exception {
        Map<String, Object> body = mapper.readValue(input.getBody(), Map.class);

        Map<String, AttributeValue> item = new HashMap<>();
        item.put("userId", AttributeValue.builder().s(userId).build());
        item.put("threshold", AttributeValue.builder().n(String.valueOf(body.get("threshold"))).build());
        item.put("email", AttributeValue.builder().s(email != null && !email.isEmpty() ? email : "unknown").build());
        item.put("trackedSymbols", AttributeValue.builder().s(String.valueOf(body.get("trackedSymbols"))).build());

        dynamoDb.putItem(PutItemRequest.builder()
                .tableName(SETTINGS_TABLE)
                .item(item)
                .build());

        return createResponse(200, "{\"message\":\"Settings saved successfully\"}");
    }

    private APIGatewayProxyResponseEvent createResponse(int statusCode, String body) {
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(statusCode)
                .withHeaders(Map.of(
                        "Content-Type", "application/json",
                        "Access-Control-Allow-Origin", "*",
                        "Access-Control-Allow-Methods", "GET,POST,OPTIONS"
                ))
                .withBody(body);
    }
}