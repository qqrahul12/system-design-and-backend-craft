package com.skills.ai.mcp;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Standard JSON-RPC 2.0 Message Structure conforming to MCP (Model Context Protocol).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class JsonRpcMessage {
    @Builder.Default
    private String jsonrpc = "2.0";
    private Object id;
    private String method;
    private Map<String, Object> params;
    private Object result;
    private JsonRpcError error;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JsonRpcError {
        private int code;
        private String message;
        private Object data;
    }
}
