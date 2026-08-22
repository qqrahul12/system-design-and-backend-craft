package com.booking.cache.impl.lru;

public class LruNode<K,V> {
    public LruNode<K,V> next;
    public LruNode<K,V> prev;
    public K key;
    public V value;

   public long ttl;
}
