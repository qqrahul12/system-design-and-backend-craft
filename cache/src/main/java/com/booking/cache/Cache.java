package com.booking.cache;

import java.util.Optional;

public interface Cache<K,V> {
    V get(K key);
    Optional<V> getOptional(K key);
    void put(K key, V value);
    void remove(K key);
    void clear();
    int size();
    boolean isEmpty();
    long getHits(K key);
    long getMisses(K key);
    long getTimeToLive(K key);
}
