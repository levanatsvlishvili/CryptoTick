package ge.levannatsvlishvili.cryptotick;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.ScanRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.stream.Collectors;

public class GetAlertsHandler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {
    private final DynamoDbClient dynamoDb = DynamoDbClient.builder().build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final String TABLE_NAME = "CryptoTick_Alerts";

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input, Context context) {
        try {
            var response = dynamoDb.scan(ScanRequest.builder().tableName(TABLE_NAME).limit(20).build());
            
            List<Map<String, String>> alerts = response.items().stream().map(item -> {
                Map<String, String> map = new HashMap<>();
                item.forEach((k, v) -> map.put(k, v.s() != null ? v.s() : v.n()));
                return map;
            }).collect(Collectors.toList());

            return new APIGatewayProxyResponseEvent()
                    .withStatusCode(200)
                    .withHeaders(Map.of("Content-Type", "application/json", "Access-Control-Allow-Origin", "*"))
                    .withBody(mapper.writeValueAsString(alerts));

        } catch (Exception e) {
            return new APIGatewayProxyResponseEvent().withStatusCode(500).withBody("Error: " + e.getMessage());
        }
    }
}