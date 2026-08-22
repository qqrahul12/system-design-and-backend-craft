# 01. Java Concurrency Primitives & Thread-Safe LRU Cache Design

## 📖 Table of Contents
1. [ReentrantLock vs. Synchronized](#1-reentrantlock-vs-synchronized)
2. [ReentrantReadWriteLock](#2-reentrantreadwritelock)
3. [ConcurrentHashMap Deep Dive & Buckets](#3-concurrenthashmap-deep-dive--buckets)
4. [Why ConcurrentHashMap Alone Is Not Enough for LRU Cache](#4-why-concurrenthashmap-alone-is-not-enough-for-lru-cache)
5. [Thread-Safe LRU Cache Architecture](#5-thread-safe-lru-cache-architecture)
6. [Per-Entry TTL (Time-To-Live) Strategy](#6-per-entry-ttl-time-to-live-strategy)
7. [Adapter Design Pattern & Caffeine Cache Architecture](#7-adapter-design-pattern--caffeine-cache-architecture)

---

## 3. ConcurrentHashMap Deep Dive & Buckets

A **bucket** is a slot in the map's internal storage array. When entries hash to the same bucket (Hash Collision), Java chains them using a **LinkedList** or **Red-Black Tree** (if > 8 items).

`ConcurrentHashMap` uses **fine-grained bucket locking**: modifying Bucket 1 locks only Bucket 1, allowing all other buckets to be read/written concurrently!

---

## 7. Adapter Design Pattern & Caffeine Cache Architecture

### The Adapter Pattern
The **Adapter Pattern** wraps an existing class with a new interface so that incompatible interfaces can work together seamlessly.

```
                  ┌──────────────────────┐
                  │    Cache<K, V>       │  (Interface)
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
┌───────────▼────────────┐        ┌───────────▼───────────┐
│       LruCache         │        │ CaffeineCacheAdapter  │
│  (Custom HashMap+LL)   │        │   (Wraps Caffeine)    │
└────────────────────────┘        └───────────────────────┘
```

### Caffeine W-TinyLFU vs. Traditional LRU

| Feature | Custom `LruCache` | Caffeine Cache |
| :--- | :--- | :--- |
| **Eviction Policy** | LRU (Recency only) | W-TinyLFU (Frequency + Recency via Count-Min Sketch) |
| **Read Concurrency** | Requires `Lock` (Mutates pointers) | Lock-Free Ring Buffers (LMAX Disruptor model) |
| **Hit Ratio** | Good | Maximum (~30% higher under burst scans) |
| **Use Case** | LLD Interviews & Custom control | High-Throughput Production Services |
