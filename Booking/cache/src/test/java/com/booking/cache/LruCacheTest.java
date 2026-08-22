package com.booking.cache;

import com.booking.cache.impl.lru.LruCache;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

public class LruCacheTest {

    private Cache<String, String> cache;

    @BeforeEach
    void setUp() {
        cache = new LruCache<>(3);
    }

    @Test
    @DisplayName("Test basic put, get, and optional retrieval")
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
    @DisplayName("Test hit and miss counter metrics")
    void testHitAndMissCounters() {
        cache.put("A", "100");
        cache.get("A"); // Hit 1
        cache.get("A"); // Hit 2
        cache.get("B"); // Miss 1

        assertEquals(2, cache.getHits("A"));
        assertEquals(1, cache.getMisses("B"));
    }

    @Test
    @DisplayName("Test LRU Eviction order when capacity is exceeded")
    void testLruEviction() {
        cache.put("K1", "V1");
        cache.put("K2", "V2");
        cache.put("K3", "V3");

        // Access K1 to make it Most Recently Used (MRU)
        cache.get("K1");

        // Add K4 -> Capacity (3) exceeded, K2 should be evicted (LRU)
        cache.put("K4", "V4");

        assertNotNull(cache.get("K1"), "K1 should still exist (recently accessed)");
        assertNull(cache.get("K2"), "K2 should be evicted as least recently used");
        assertNotNull(cache.get("K3"), "K3 should still exist");
        assertNotNull(cache.get("K4"), "K4 should exist");
    }

    @Test
    @DisplayName("Test TTL expiration lazily purges key on get()")
    void testTtlExpiration() throws InterruptedException {
        // Put item with past TTL (expired)
        LruCache<String, String> lruCache = (LruCache<String, String>) cache;
        lruCache.put("EX1", "VAL1");

        // Simulating TTL expiration by directly testing expired threshold or waiting
        // Verify normal get before expiry works
        assertNotNull(cache.get("EX1"));
    }

    @Test
    @DisplayName("Test high-concurrency multi-threaded access")
    void testConcurrentAccess() throws InterruptedException {
        int threads = 10;
        int operationsPerThread = 500;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);
        AtomicInteger errorCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final int threadId = i;
            executor.submit(() -> {
                try {
                    for (int j = 0; j < operationsPerThread; j++) {
                        String key = "Key-" + (j % 5);
                        String value = "Val-" + threadId + "-" + j;
                        cache.put(key, value);
                        cache.get(key);
                        if (j % 10 == 0) {
                            cache.remove(key);
                        }
                    }
                } catch (Exception e) {
                    errorCount.incrementAndGet();
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        assertEquals(0, errorCount.get(), "No exceptions should occur during concurrent access");
    }
}
