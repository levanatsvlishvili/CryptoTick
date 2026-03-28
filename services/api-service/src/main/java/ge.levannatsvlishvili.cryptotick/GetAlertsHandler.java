package ge.levannatsvlishvili.cryptotick;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.JsonNode;
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
        String method = input.getHttpMethod();

        try {
            if ("GET".equalsIgnoreCase(method)) {
                return handleGetAlerts();
            } else if ("POST".equalsIgnoreCase(method)) {
                return handleSaveSettings(input);
            }
            return createResponse(405, "{\"error\":\"Method Not Allowed\"}");
        } catch (Exception e) {
            return createResponse(500, "{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    private APIGatewayProxyResponseEvent handleGetAlerts() throws Exception {
        ScanResponse response = dynamoDb.scan(ScanRequest.builder().tableName(ALERTS_TABLE).limit(20).build());
        List<Map<String, String>> alerts = response.items().stream().map(item -> {
            Map<String, String> map = new HashMap<>();
            item.forEach((k, v) -> map.put(k, v.s() != null ? v.s() : v.n()));
            return map;
        }).collect(Collectors.toList());

        return createResponse(200, mapper.writeValueAsString(alerts));
    }

    private APIGatewayProxyResponseEvent handleSaveSettings(APIGatewayProxyRequestEvent input) throws Exception {
        Map<String, Object> authorizer = input.getRequestContext().getAuthorizer();
        Map<String, Object> claims = (Map<String, Object>) authorizer.get("claims");
        String userId = (String) claims.get("sub");
        String email = (String) claims.get("email");

        JsonNode body = mapper.readTree(input.getBody());
        double threshold = body.get("threshold").asDouble();

        dynamoDb.putItem(PutItemRequest.builder()
                .tableName(SETTINGS_TABLE)
                .item(Map.of(
                        "userId", AttributeValue.builder().s(userId).build(),
                        "threshold", AttributeValue.builder().n(String.valueOf(threshold)).build(),
                        "email", AttributeValue.builder().s(email).build()
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