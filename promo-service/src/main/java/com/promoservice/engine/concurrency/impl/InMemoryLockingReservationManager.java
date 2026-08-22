package com.promoservice.engine.concurrency.impl;

import com.promoservice.engine.concurrency.ReservationManager;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Concurrency Approach 1: In-Memory JVM Locking using ReentrantLock & AtomicInteger.
 * Demonstrates thread-safe critical sections inside a single JVM node.
 */
@Service("inMemoryReservationManager")
public class InMemoryLockingReservationManager implements ReservationManager {

    private final Map<String, AtomicInteger> promoGlobalCounters = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> userUsageCounters = new ConcurrentHashMap<>();
    private final Map<String, ReservationHold> activeReservations = new ConcurrentHashMap<>();

    // Fair ReentrantLock to serialize access to the critical reservation section
    private final ReentrantLock lock = new ReentrantLock(true);

    @Override
    public ReservationResult reserve(String promoId, String actorId, int maxGlobalLimit, int maxPerActorLimit, long ttlSeconds) {
        // Critical Section: Acquire Lock
        lock.lock();
        try {
            AtomicInteger globalCounter = promoGlobalCounters.computeIfAbsent(promoId, k -> new AtomicInteger(0));
            String userKey = promoId + ":" + actorId;
            AtomicInteger userCounter = userUsageCounters.computeIfAbsent(userKey, k -> new AtomicInteger(0));

            // Check global limit
            if (globalCounter.get() >= maxGlobalLimit) {
                return new ReservationResult(false, null, "GLOBAL_LIMIT_EXHAUSTED");
            }

            // Check per-user limit
            if (userCounter.get() >= maxPerActorLimit) {
                return new ReservationResult(false, null, "USER_LIMIT_EXCEEDED");
            }

            // Increment atomic counters safely inside lock
            globalCounter.incrementAndGet();
            userCounter.incrementAndGet();

            String resId = "res_" + UUID.randomUUID().toString().substring(0, 8);
            activeReservations.put(resId, new ReservationHold(resId, promoId, actorId));

            return new ReservationResult(true, resId, null);
        } finally {
            lock.unlock(); // Always release lock in finally block!
        }
    }

    @Override
    public boolean commit(String reservationId) {
        ReservationHold hold = activeReservations.remove(reservationId);
        return hold != null;
    }

    @Override
    public boolean release(String reservationId) {
        lock.lock();
        try {
            ReservationHold hold = activeReservations.remove(reservationId);
            if (hold == null) {
                return false;
            }

            // Rollback counters on release
            AtomicInteger global = promoGlobalCounters.get(hold.promoId());
            if (global != null && global.get() > 0) {
                global.decrementAndGet();
            }

            AtomicInteger user = userUsageCounters.get(hold.promoId() + ":" + hold.actorId());
            if (user != null && user.get() > 0) {
                user.decrementAndGet();
            }

            return true;
        } finally {
            lock.unlock();
        }
    }

    @Override
    public int getCurrentCount(String promoId) {
        AtomicInteger counter = promoGlobalCounters.get(promoId);
        return counter != null ? counter.get() : 0;
    }

    private record ReservationHold(String reservationId, String promoId, String actorId) {}
}
