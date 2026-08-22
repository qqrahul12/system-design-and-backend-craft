package com.booking.cache.impl.lru;

import com.booking.cache.Cache;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

public class LruCache<K,V> implements Cache<K,V> {

    private final int capacity;
    ConcurrentHashMap<K,LruNode<K,V>> map;
    LruLinkedList<K,V> lruList;
    ReentrantLock lock = new ReentrantLock();

    AtomicLong hits = new AtomicLong();
    AtomicLong misses = new AtomicLong();

    public LruCache(int maxSize) {
        this.capacity = maxSize;
        map = new ConcurrentHashMap<>(maxSize);
        lruList = new LruLinkedList<>();
    }

    /**
     * @param key
     * @return
     */
    @Override
    public V get(K key) {
        lock.lock();
        try {
            LruNode<K, V> node = map.get(key);
            if (node == null) {
                misses.incrementAndGet();
                return null;
            }
            if (System.currentTimeMillis() > node.ttl) {
                map.remove(key);
                lruList.removeNode(node);
                misses.incrementAndGet();
                return  null;
            }
            lruList.moveToHead(node);
            hits.incrementAndGet();
            return node.value;
        } finally {
            lock.unlock();
        }
    }

    /**
     * @param key
     * @return
     */
    @Override
    public Optional<V> getOptional(K key) {
        V value = get(key);
        if (value != null) {
            return Optional.of(value);
        }
        return Optional.empty();
    }

    /**
     * @param key
     * @param value
     */
    @Override
    public void put(K key, V value) {
        lock.lock();
        try {
            if(map.size() >= capacity && !map.containsKey(key)) {
               K removedKey = lruList.removeFromTail();
               map.remove(removedKey);
            }
            LruNode<K,V> node = new LruNode<>();
            node.key = key;
            node.value = value;
            node.ttl = Long.MAX_VALUE;
            map.put(key, node);
            lruList.addToHead(node);
        } finally {
            lock.unlock();
        }
    }

    /**
     * @param key
     */
    @Override
    public void remove(K key) {
        lock.lock();
        try {
            LruNode<K,V> node = map.remove(key);
            if (node != null) {
                lruList.removeNode(node);
            }
        } finally {
            lock.unlock();
        }
    }

    /**
     *
     */
    @Override
    public void clear() {
        map.clear();
        lruList.clear();
    }

    /**
     * @return
     */
    @Override
    public int size() {
        return map.size();
    }

    /**
     * @return
     */
    @Override
    public boolean isEmpty() {
        return map.isEmpty();
    }

    /**
     * @param key
     * @return
     */
    @Override
    public long getHits(K key) {
        return hits.get();
    }

    /**
     * @param key
     * @return
     */
    @Override
    public long getMisses(K key) {
        return misses.get();
    }

    /**
     * @param key
     * @return
     */
    @Override
    public long getTimeToLive(K key) {
        LruNode<K,V> node = map.get(key);
        return node.ttl;
    }
}
