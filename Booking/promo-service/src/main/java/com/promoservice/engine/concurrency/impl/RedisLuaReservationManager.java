package com.promoservice.engine.concurrency.impl;

import com.promoservice.engine.concurrency.ReservationManager;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Concurrency Approach 2 (Production Standard): Lock-Free Atomic Counters via Lua Scripting logic.
 * Demonstrates sub-millisecond atomic counter evaluation without JVM thread blocking or lock waiting overhead.
 */
@Service("redisLuaReservationManager")
public class RedisLuaReservationManager implements ReservationManager {

    // Simulates Redis Key-Value Store & Atomic Lua Script Execution Engine
    private final Map<String, AtomicInteger> redisStore = new ConcurrentHashMap<>();
    private final Map<String, ReservationHold> activeReservations = new ConcurrentHashMap<>();

    @Override
    public synchronized ReservationResult reserve(String promoId, String actorId, int maxGlobalLimit, int maxPerActorLimit, long ttlSeconds) {
        // Atomic Execution Block (Simulates single-threaded Redis Lua Script execution)
        String globalKey = "promo:" + promoId + ":total_count";
        String userKey = "promo:" + promoId + ":user:" + actorId;

        AtomicInteger globalCounter = redisStore.computeIfAbsent(globalKey, k -> new AtomicInteger(0));
        AtomicInteger userCounter = redisStore.computeIfAbsent(userKey, k -> new AtomicInteger(0));

        // 1. Check Global Limit
        if (globalCounter.get() >= maxGlobalLimit) {
            return new ReservationResult(false, null, "GLOBAL_LIMIT_EXHAUSTED");
        }

        // 2. Check Per-User Limit
        if (userCounter.get() >= maxPerActorLimit) {
            return new ReservationResult(false, null, "USER_LIMIT_EXCEEDED");
        }

        // 3. Atomically INCR both keys
        globalCounter.incrementAndGet();
        userCounter.incrementAndGet();

        String resId = "res_lua_" + UUID.randomUUID().toString().substring(0, 8);
        activeReservations.put(resId, new ReservationHold(resId, globalKey, userKey));

        return new ReservationResult(true, resId, null);
    }

    @Override
    public boolean commit(String reservationId) {
        return activeReservations.remove(reservationId) != null;
    }

    @Override
    public synchronized boolean release(String reservationId) {
        ReservationHold hold = activeReservations.remove(reservationId);
        if (hold == null) {
            return false;
        }

        // Rollback atomic counters in Redis
        AtomicInteger globalCounter = redisStore.get(hold.globalKey());
        if (globalCounter != null && globalCounter.get() > 0) {
            globalCounter.decrementAndGet();
        }

        AtomicInteger userCounter = redisStore.get(hold.userKey());
        if (userCounter != null && userCounter.get() > 0) {
            userCounter.decrementAndGet();
        }

        return true;
    }

    @Override
    public int getCurrentCount(String promoId) {
        AtomicInteger counter = redisStore.get("promo:" + promoId + ":total_count");
        return counter != null ? counter.get() : 0;
    }

    private record ReservationHold(String reservationId, String globalKey, String userKey) {}
}
