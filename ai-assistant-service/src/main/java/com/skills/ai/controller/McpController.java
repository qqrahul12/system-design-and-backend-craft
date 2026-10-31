package com.skills.ai.controller;

import com.skills.ai.mcp.JsonRpcMessage;
import com.skills.ai.mcp.McpToolDefinition;
import com.skills.ai.mcp.McpToolRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Standard Model Context Protocol (MCP) Server Endpoint.
 *
 * <p>Implements standard JSON-RPC 2.0 methods conforming to the MCP specification:
 * <ul>
 *   <li>{@code initialize} — Protocol handshake and capability exchange</li>
 *   <li>{@code tools/list} — Discover available tools and schema specifications</li>
 *   <li>{@code tools/call} — Execute tools dynamically</li>
 * </ul>
 * Compatible with Cursor, Claude Desktop, Antigravity, or web frontends.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/mcp")
@RequiredArgsConstructor
public class McpController {

    private final McpToolRegistry toolRegistry;

    @PostMapping
    public ResponseEntity<JsonRpcMessage> handleJsonRpc(@RequestBody JsonRpcMessage request) {
        log.info("Received MCP JSON-RPC call: method={}, id={}", request.getMethod(), request.getId());

        String method = request.getMethod();
        if (method == null) {
            return ResponseEntity.badRequest().body(JsonRpcMessage.builder()
                    .jsonrpc("2.0")
                    .id(request.getId())
                    .error(new JsonRpcMessage.JsonRpcError(-32600, "Invalid Request: method is missing", null))
                    .build());
        }

        switch (method) {
            case "initialize":
                return ResponseEntity.ok(JsonRpcMessage.builder()
                        .jsonrpc("2.0")
                        .id(request.getId())
                        .result(Map.of(
                                "protocolVersion", "2024-11-05",
                                "capabilities", Map.of(
                                        "tools", Map.of("listChanged", true)
                                ),
                                "serverInfo", Map.of(
                                        "name", "cinemind-mcp-server",
                                        "version", "1.0.0"
                                )
                        ))
                        .build());

            case "tools/list":
                List<McpToolDefinition> tools = toolRegistry.listTools();
                return ResponseEntity.ok(JsonRpcMessage.builder()
                        .jsonrpc("2.0")
                        .id(request.getId())
                        .result(Map.of("tools", tools))
                        .build());

            case "tools/call":
                Map<String, Object> params = request.getParams();
                if (params == null || !params.containsKey("name")) {
                    return ResponseEntity.ok(JsonRpcMessage.builder()
                            .jsonrpc("2.0")
                            .id(request.getId())
                            .error(new JsonRpcMessage.JsonRpcError(-32602, "Invalid params: 'name' is required", null))
                            .build());
                }

                String toolName = (String) params.get("name");
                @SuppressWarnings("unchecked")
                Map<String, Object> args = (Map<String, Object>) params.getOrDefault("arguments", Map.of());

                McpToolDefinition.CallResult result = toolRegistry.executeTool(toolName, args);
                return ResponseEntity.ok(JsonRpcMessage.builder()
                        .jsonrpc("2.0")
                        .id(request.getId())
                        .result(result)
                        .build());

            default:
                return ResponseEntity.ok(JsonRpcMessage.builder()
                        .jsonrpc("2.0")
                        .id(request.getId())
                        .error(new JsonRpcMessage.JsonRpcError(-32601, "Method not found: " + method, null))
                        .build());
        }
    }
}
