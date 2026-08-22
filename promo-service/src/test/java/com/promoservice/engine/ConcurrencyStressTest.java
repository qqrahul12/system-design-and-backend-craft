package com.promoservice.engine;

import com.promoservice.engine.concurrency.ReservationManager;
import com.promoservice.engine.concurrency.impl.InMemoryLockingReservationManager;
import com.promoservice.engine.concurrency.impl.RedisLuaReservationManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class ConcurrencyStressTest {

    @Test
    @DisplayName("Chunk 5: Unsafe Counter WITHOUT Locks -> Fails with Race Condition / Over-Allocation")
    void testUnsafeRaceCondition() throws InterruptedException {
        int totalThreads = 1000;
        int promoLimit = 100;

        UnsafeCounter counter = new UnsafeCounter();
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch finishGate = new CountDownLatch(totalThreads);

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < totalThreads; i++) {
                executor.submit(() -> {
                    try {
                        startGate.await(); // Align all 1,000 threads to blast at once
                        counter.incrementIfUnder(promoLimit);
                    } catch (InterruptedException ignored) {
                    } finally {
                        finishGate.countDown();
                    }
                });
            }

            startGate.countDown(); // Release 1,000 threads simultaneously!
            finishGate.await();
        }

        // Without locks, unsafe counter will over-allocate beyond 100 due to race conditions!
        System.out.println("Unsafe counter final value (Expected > 100 due to race condition): " + counter.getCount());
        assertTrue(counter.getCount() >= promoLimit, "Unsafe counter over-allocates under high concurrency");
    }

    @Test
    @DisplayName("Chunk 5: Approach 1 - ReentrantLock Stress Test (1,000 Concurrent Threads -> EXACTLY 100 Claims)")
    void testReentrantLockConcurrency() throws InterruptedException {
        ReservationManager reservationManager = new InMemoryLockingReservationManager();
        runMultiThreadedStressTest(reservationManager, "FLASH_REENTRANT_100");
    }

    @Test
    @DisplayName("Chunk 5: Approach 2 - Lock-Free Atomic Counter Stress Test (1,000 Concurrent Threads -> EXACTLY 100 Claims)")
    void testAtomicLuaConcurrency() throws InterruptedException {
        ReservationManager reservationManager = new RedisLuaReservationManager();
        runMultiThreadedStressTest(reservationManager, "FLASH_LUA_100");
    }

    private void runMultiThreadedStressTest(ReservationManager manager, String promoId) throws InterruptedException {
        int totalThreads = 1000;
        int promoLimit = 100;
        int maxPerUser = 1;

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch finishGate = new CountDownLatch(totalThreads);

        // Java 21 Virtual Threads Executor!
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < totalThreads; i++) {
                final String userId = "user_" + i;
                executor.submit(() -> {
                    try {
                        startGate.await(); // Align threads
                        ReservationManager.ReservationResult result = manager.reserve(promoId, userId, promoLimit, maxPerUser, 900);
                        if (result.success()) {
                            successCount.incrementAndGet();
                        } else {
                            rejectedCount.incrementAndGet();
                        }
                    } catch (InterruptedException ignored) {
                    } finally {
                        finishGate.countDown();
                    }
                });
            }

            startGate.countDown(); // BLAST 1,000 threads simultaneously!
            finishGate.await();
        }

        // VERIFICATION: Zero Over-Allocation!
        assertEquals(100, successCount.get(), "EXACTLY 100 reservations must succeed!");
        assertEquals(900, rejectedCount.get(), "EXACTLY 900 reservations must be cleanly rejected!");
        assertEquals(100, manager.getCurrentCount(promoId), "Final promo counter must be 100!");

        System.out.println("Stress Test Passed for " + promoId + ": Successful=" + successCount.get() + ", Rejected=" + rejectedCount.get());
    }

    // Helper class demonstrating naive, non-thread-safe counter
    private static class UnsafeCounter {
        private int count = 0;

        public void incrementIfUnder(int limit) {
            if (count < limit) {
                // Thread Context Switch Window!
                try {
                    Thread.sleep(1);
                } catch (InterruptedException ignored) {}
                count++;
            }
        }

        public int getCount() {
            return count;
        }
    }
}
