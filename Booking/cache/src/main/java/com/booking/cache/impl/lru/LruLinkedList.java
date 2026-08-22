package com.booking.cache.impl.lru;

import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class LruLinkedList<K,V> {
    private LruNode<K,V> head;
    private LruNode<K,V> tail;
    public LruLinkedList() {
        head = new LruNode<>();
        tail = new LruNode<>();
        head.prev = tail;
        tail.next = head;
    }

    public LruLinkedList(LruNode<K,V> head) {
        this.head = head;
    }

    public LruNode<K,V> getHead() {
        return head;
    }

    public void addToHead(LruNode<K,V> node) {
        LruNode<K,V> prev = head.prev;
        node.prev = prev;
        prev.next = node;
        head.prev = node;
        node.next = head;
    }

    public void moveToHead(LruNode<K,V> node) {
        removeNode(node);
        addToHead(node);
    }

    public K removeFromTail() {
        if (tail.next == head) {
            throw new LruEmptyException("LruLinkedList is empty");
        }
        LruNode<K,V> node = tail.next;
        LruNode<K,V> next = node.next;
        tail.next = next;
        next.prev = tail;
        return node.key;
    }

    public void removeNode(LruNode<K,V> node) {
        if (node == null) {
            throw new NullPointerException("Provided node is null");
        }
        LruNode<K,V> prev = node.prev;
        LruNode<K,V> next = node.next;
        if (tail == node) {
            tail = tail.next;
        }
        if(head == node) {
            head = head.prev;
        }
        if (prev != null) {
            prev.next = next;
        }
        if (next != null) {
            next.prev = prev;
        }
    }

    public void clear() {
        head.prev = tail;
        tail.next = head;
    }
}
