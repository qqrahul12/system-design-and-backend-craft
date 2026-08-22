package com.booking.service;

import com.booking.config.AsyncBookingConfig;
import com.booking.dto.BookingTask;
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

import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(classes = {AsyncBookingProcessorTest.TestConfig.class, AsyncBookingProcessor.class, AsyncBookingConfig.class})
public class AsyncBookingProcessorTest {

    @SpringBootApplication
    @EntityScan(basePackages = "com.booking.entity")
    @EnableJpaRepositories(basePackages = "com.booking.repository")
    static class TestConfig {}

    @Autowired
    private AsyncBookingProcessor asyncBookingProcessor;

    @Autowired
    private ShowSeatRepository showSeatRepository;

    @BeforeEach
    void setUp() {
        showSeatRepository.deleteAll();
        ShowSeatEntity seat = ShowSeatEntity.builder()
                .id("SHOW_7PM:B5")
                .showId("SHOW_7PM")
                .seatNumber("B5")
                .seatCategory("REGULAR")
                .status("RESERVED")
                .price(12.0)
                .version(0L)
                .build();
        showSeatRepository.save(seat);
    }

    @Test
    @DisplayName("Test Successful Async Booking Pipeline")
    void testSuccessfulAsyncBookingPipeline() throws Exception {
        BookingTask task = BookingTask.builder()
                .bookingId("BOOK-1001")
                .showId("SHOW_7PM")
                .seatNumber("B5")
                .userEmail("rahul@example.com")
                .amount(12.0)
                .status("PENDING")
                .build();

        CompletableFuture<BookingTask> future = asyncBookingProcessor.processBookingAsync(task);
        BookingTask result = future.get(); // Join async future

        assertNotNull(result);
        assertEquals("CONFIRMED", result.getStatus());
    }

    @Test
    @DisplayName("Test Failed Async Booking Pipeline Triggers Rollback")
    void testFailedAsyncBookingPipelineTriggersRollback() throws Exception {
        BookingTask task = BookingTask.builder()
                .bookingId("BOOK-1002")
                .showId("SHOW_7PM")
                .seatNumber("B5")
                .userEmail("rahul@example.com")
                .amount(0.0) // Invalid amount -> Triggers Payment Failure
                .status("PENDING")
                .build();

        CompletableFuture<BookingTask> future = asyncBookingProcessor.processBookingAsync(task);
        BookingTask result = future.get(); // Exception handled by exceptionally()

        assertNotNull(result);
        assertEquals("FAILED", result.getStatus());

        // Verify Seat Status rolled back to AVAILABLE in DB!
        ShowSeatEntity seat = showSeatRepository.findByShowIdAndSeatNumber("SHOW_7PM", "B5").orElse(null);
        assertNotNull(seat);
        assertEquals("AVAILABLE", seat.getStatus());
    }
}
