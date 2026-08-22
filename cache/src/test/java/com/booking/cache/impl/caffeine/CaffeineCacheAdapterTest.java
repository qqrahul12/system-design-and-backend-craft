package com.booking.cache.impl.caffeine;

import com.booking.cache.Cache;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

public class CaffeineCacheAdapterTest {

    private Cache<String, String> cache;

    @BeforeEach
    void setUp() {
        // Max size = 3, default TTL = 5000ms (5 seconds)
        cache = new CaffeineCacheAdapter<>(3, 5000);
    }

    @Test
    @DisplayName("Test basic put, get, and optional retrieval on Caffeine")
    void testBasicPutAndGet() {
        cache.put("K1", "V1");
        cache.put("K2", "V2");

        assertEquals("V1", cache.get("K1"));
        assertEquals("V2", cache.get("K2"));
        assertEquals(Optional.of("V1"), cache.getOptional("K1"));
        assertNull(cache.get("K3"));
        assertEquals(Optional.empty(), cache.getOptional("K3"));
    }

    @Test
    @DisplayName("Test Caffeine hit and miss metrics")
    void testHitAndMissCounters() {
        cache.put("A", "100");
        cache.get("A"); // Hit 1
        cache.get("A"); // Hit 2
        cache.get("B"); // Miss 1

        assertEquals(2, cache.getHits("A"));
        assertEquals(1, cache.getMisses("B"));
    }

    @Test
    @DisplayName("Test Caffeine capacity eviction")
    void testCapacityEviction() {
        cache.put("K1", "V1");
        cache.put("K2", "V2");
        cache.put("K3", "V3");
        cache.put("K4", "V4"); // Capacity 3 exceeded

        // Force Caffeine maintenance task to process eviction synchronously
        ((CaffeineCacheAdapter<String, String>) cache).cleanUp();

        // Size should be at most 3
        assertTrue(cache.size() <= 3);
    }

    @Test
    @DisplayName("Test Caffeine invalidate and clear")
    void testRemoveAndClear() {
        cache.put("K1", "V1");
        cache.put("K2", "V2");

        cache.remove("K1");
        assertNull(cache.get("K1"));

        cache.clear();
        assertTrue(cache.isEmpty());
        assertEquals(0, cache.size());
    }
}
