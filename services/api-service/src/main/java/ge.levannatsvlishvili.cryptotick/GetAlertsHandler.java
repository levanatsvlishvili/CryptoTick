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

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input, Context context) {
        try {
            Map<String, Object> authorizer = input.getRequestContext().getAuthorizer();
            Map<String, Object> claims = (Map<String, Object>) authorizer.get("claims");
            String userId = (String) claims.get("sub");
            String email = (String) claims.get("email");

            String method = input.getHttpMethod();
            if ("GET".equalsIgnoreCase(method)) {
                return handleGetCombinedData(userId);
            } else if ("POST".equalsIgnoreCase(method)) {
                return handleSaveSettings(input, userId, email);
            }
            return createResponse(405, "{\"error\":\"Method Not Allowed\"}");
        } catch (Exception e) {
            return createResponse(500, "{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    private APIGatewayProxyResponseEvent handleGetCombinedData(String userId) throws Exception {
        GetItemResponse settingsResp = dynamoDb.getItem(GetItemRequest.builder()
                .tableName(SETTINGS_TABLE)
                .key(Map.of("userId", AttributeValue.builder().s(userId).build()))
                .build());

        Map<String, String> userSettings = new HashMap<>();
        if (settingsResp.hasItem()) {
            settingsResp.item().forEach((k, v) -> userSettings.put(k, v.s() != null ? v.s() : v.n()));
        }

        ScanResponse alertsResp = dynamoDb.scan(ScanRequest.builder()
                .tableName(ALERTS_TABLE)
                .filterExpression("userId = :uid")
                .expressionAttributeValues(Map.of(":uid", AttributeValue.builder().s(userId).build()))
                .build());

        List<Map<String, String>> alerts = alertsResp.items().stream()
                .map(item -> {
                    Map<String, String> map = new HashMap<>();
                    item.forEach((k, v) -> map.put(k, v.s() != null ? v.s() : v.n()));
                    return map;
                })
                .sorted((a, b) -> Long.compare(Long.parseLong(b.get("timestamp")), Long.parseLong(a.get("timestamp"))))
                .collect(Collectors.toList());

        Map<String, Object> responseMap = new HashMap<>();
        responseMap.put("alerts", alerts);
        responseMap.put("settings", userSettings);

        return createResponse(200, mapper.writeValueAsString(responseMap));
    }

    private APIGatewayProxyResponseEvent handleSaveSettings(APIGatewayProxyRequestEvent input, String userId, String email) throws Exception {
        Map<String, Object> body = mapper.readValue(input.getBody(), Map.class);

        dynamoDb.putItem(PutItemRequest.builder()
                .tableName(SETTINGS_TABLE)
                .item(Map.of(
                        "userId", AttributeValue.builder().s(userId).build(),
                        "threshold", AttributeValue.builder().n(String.valueOf(body.get("threshold"))).build(),
                        "email", AttributeValue.builder().s(email).build(),
                        "trackedSymbols", AttributeValue.builder().s(String.valueOf(body.get("trackedSymbols"))).build()
                ))
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