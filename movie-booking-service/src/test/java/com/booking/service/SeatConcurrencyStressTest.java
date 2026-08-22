package com.booking.service;

import com.booking.entity.ShowSeatEntity;
import com.booking.repository.ShowSeatRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
public class SeatConcurrencyStressTest {

    @SpringBootApplication
    @org.springframework.context.annotation.Import(com.booking.config.AsyncBookingConfig.class)
    @EntityScan(basePackages = "com.booking.entity")
    @EnableJpaRepositories(basePackages = "com.booking.repository")
    static class TestConfig {}

    @org.springframework.boot.test.mock.mockito.MockBean
    private org.redisson.api.RedissonClient redissonClient;

    @Autowired
    private SeatReservationService seatReservationService;

    @Autowired
    private ShowSeatRepository showSeatRepository;

    @BeforeEach
    void setUp() {
        showSeatRepository.deleteAll();
        ShowSeatEntity seat = ShowSeatEntity.builder()
                .id("SHOW_6PM:A1")
                .showId("SHOW_6PM")
                .seatNumber("A1")
                .seatCategory("VIP")
                .status("AVAILABLE")
                .price(15.0)
                .version(0L)
                .build();
        showSeatRepository.save(seat);
    }

    @Test
    @DisplayName("Stress Test: 100 concurrent threads reserving Seat A1 for SHOW_6PM with Optimistic Locking")
    void testOptimisticLockingConcurrency() throws InterruptedException {
        int threads = 100;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch readyLatch = new CountDownLatch(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    seatReservationService.reserveShowSeatOptimistic("SHOW_6PM", "A1");
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    rejectedCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await();
        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        System.out.println("Optimistic Lock Result -> Success: " + successCount.get() + ", Rejected: " + rejectedCount.get());

        assertEquals(1, successCount.get(), "Only 1 thread should successfully reserve Seat A1 for SHOW_6PM!");
        assertEquals(99, rejectedCount.get(), "99 threads should be rejected!");
    }

    @Test
    @DisplayName("Stress Test: 100 concurrent threads reserving Seat A1 for SHOW_6PM with Pessimistic Locking")
    void testPessimisticLockingConcurrency() throws InterruptedException {
        int threads = 100;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch readyLatch = new CountDownLatch(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    seatReservationService.reserveShowSeatPessimistic("SHOW_6PM", "A1");
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    rejectedCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await();
        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        System.out.println("Pessimistic Lock Result -> Success: " + successCount.get() + ", Rejected: " + rejectedCount.get());

        assertEquals(1, successCount.get(), "Only 1 thread should successfully reserve Seat A1 for SHOW_6PM!");
        assertEquals(99, rejectedCount.get(), "99 threads should be rejected!");
    }
}
