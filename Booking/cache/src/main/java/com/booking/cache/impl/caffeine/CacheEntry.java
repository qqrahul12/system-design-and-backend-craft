package com.booking.cache.impl.caffeine;

public class CacheEntry<V> {
    private final V value;
    private final long ttlMs;

    public CacheEntry(V value, long ttlMs) {
        this.value = value;
        this.ttlMs = ttlMs;
    }

    public V getValue() { return value; }
    public long getTtlMs() { return ttlMs; }
}
