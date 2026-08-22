package com.booking.cache.impl.caffeine;

import com.booking.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Expiry;
import org.checkerframework.checker.index.qual.NonNegative;

import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

public class CaffeineCacheAdapter<K,V> implements Cache<K,V> {

    private final com.github.benmanes.caffeine.cache.Cache<K, CacheEntry<V>> caffeineCache;
    private final int defaultTtlMs;

    public CaffeineCacheAdapter(int maxSize, int defaultTtlMs) {

        this.defaultTtlMs = defaultTtlMs;
        this.caffeineCache = Caffeine.newBuilder()
                .maximumSize(maxSize)
                .expireAfter(new Expiry<K, CacheEntry<V>>() {

                    /**
                     * @param k
                     * @param vCacheEntry
                     * @param l
                     * @return
                     */
                    @Override
                    public long expireAfterCreate(K k, CacheEntry<V> vCacheEntry, long l) {
                        return TimeUnit.MILLISECONDS.toNanos(vCacheEntry.getTtlMs());
                    }

                    /**
                     * @param k
                     * @param vCacheEntry
                     * @param l
                     * @param l1
                     * @return
                     */
                    @Override
                    public long expireAfterUpdate(K k, CacheEntry<V> vCacheEntry, long l, @NonNegative long l1) {
                        return TimeUnit.MILLISECONDS.toNanos(vCacheEntry.getTtlMs());
                    }

                    /**
                     * @param k
                     * @param vCacheEntry
                     * @return
                     */
                    @Override
                    public long expireAfterRead(K k, CacheEntry<V> vCacheEntry, long currentTime, @NonNegative long currentDuration) {
                        return currentDuration;
                    }
                })
                .recordStats()
                .build();
    }

    /**
     * @param key
     * @return
     */
    @Override
    public V get(K key) {
        CacheEntry<V> cacheEntry = caffeineCache.getIfPresent(key);
        return cacheEntry == null ? null : cacheEntry.getValue();
    }

    /**
     * @param key
     * @return
     */
    @Override
    public Optional<V> getOptional(K key) {
        V value = get(key);
        return value == null ? Optional.empty() : Optional.of(value);
    }

    /**
     * @param key
     * @param value
     */
    @Override
    public void put(K key, V value) {
        caffeineCache.put(key, new CacheEntry<>(value, defaultTtlMs));
    }

    /**
     * @param key
     */
    @Override
    public void remove(K key) {
        caffeineCache.invalidate(key);
    }

    /**
     *
     */
    @Override
    public void clear() {
        caffeineCache.invalidateAll();
    }

    public void cleanUp() {
        caffeineCache.cleanUp();
    }

    /**
     * @return
     */
    @Override
    public int size() {
        return caffeineCache.asMap().size();
    }

    /**
     * @return
     */
    @Override
    public boolean isEmpty() {
        return caffeineCache.asMap().isEmpty();
    }

    /**
     * @param key
     * @return
     */
    @Override
    public long getHits(K key) {
        return caffeineCache.stats().hitCount();
    }

    /**
     * @param key
     * @return
     */
    @Override
    public long getMisses(K key) {
        return caffeineCache.stats().missCount();
    }

    /**
     * @param key
     * @return
     */
    @Override
    public long getTimeToLive(K key) {
        CacheEntry<V> cacheEntry = caffeineCache.getIfPresent(key);
        return cacheEntry == null ? 0 : cacheEntry.getTtlMs();
    }
}
