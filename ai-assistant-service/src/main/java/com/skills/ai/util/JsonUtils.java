package com.skills.ai.util;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Centralized, thread-safe JSON serialization and deserialization utility.
 * Eliminates repetitive boilerplate, ObjectMapper re-instantiations, and custom try-catch blocks across services.
 */
@Slf4j
public final class JsonUtils {

    private static final ObjectMapper OBJECT_MAPPER = createObjectMapper();

    private JsonUtils() {}

    private static ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        mapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        return mapper;
    }

    public static ObjectMapper getMapper() {
        return OBJECT_MAPPER;
    }

    public static String toJson(Object object) {
        if (object == null) return null;
        try {
            return OBJECT_MAPPER.writeValueAsString(object);
        } catch (Exception e) {
            log.error("Failed to serialize object to JSON: {}", e.getMessage());
            return null;
        }
    }

    public static String toJsonOrFallback(Object object, String fallback) {
        if (object == null) return fallback;
        try {
            return OBJECT_MAPPER.writeValueAsString(object);
        } catch (Exception e) {
            log.error("Failed to serialize object to JSON, returning fallback: {}", e.getMessage());
            return fallback;
        }
    }

    public static <T> T fromJson(String json, Class<T> clazz) {
        if (json == null || json.isBlank()) return null;
        try {
            return OBJECT_MAPPER.readValue(json, clazz);
        } catch (Exception e) {
            log.error("Failed to deserialize JSON to {}: {}", clazz.getSimpleName(), e.getMessage());
            return null;
        }
    }

    public static <T> T fromJson(String json, TypeReference<T> typeRef) {
        if (json == null || json.isBlank()) return null;
        try {
            return OBJECT_MAPPER.readValue(json, typeRef);
        } catch (Exception e) {
            log.error("Failed to deserialize JSON to {}: {}", typeRef.getType(), e.getMessage());
            return null;
        }
    }

    public static List<Map<String, Object>> fromJsonListOfMaps(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.error("Failed to deserialize JSON list of maps: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
