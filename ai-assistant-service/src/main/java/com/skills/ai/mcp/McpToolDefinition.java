package com.skills.ai.mcp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Standard MCP Tool Definition Model.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class McpToolDefinition {
    private String name;
    private String description;
    private Map<String, Object> inputSchema;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CallResult {
        private List<ContentItem> content;
        private boolean isError;

        public static CallResult text(String text) {
            return CallResult.builder()
                    .content(List.of(new ContentItem("text", text)))
                    .isError(false)
                    .build();
        }

        public static CallResult error(String errorMessage) {
            return CallResult.builder()
                    .content(List.of(new ContentItem("text", errorMessage)))
                    .isError(true)
                    .build();
        }
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ContentItem {
        private String type;
        private String text;
    }
}
