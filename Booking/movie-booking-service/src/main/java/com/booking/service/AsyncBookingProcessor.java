package com.booking.service;

import com.booking.dto.BookingTask;
import com.booking.repository.ShowSeatRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;

@Service
public class AsyncBookingProcessor {

    private final ShowSeatRepository showSeatRepository;
    private final ExecutorService bookingThreadPool;

    public AsyncBookingProcessor(ShowSeatRepository showSeatRepository,
                                 @Qualifier("bookingThreadPool") ExecutorService bookingThreadPool) {
        this.showSeatRepository = showSeatRepository;
        this.bookingThreadPool = bookingThreadPool;
    }

    /**
     * TODO Step 1: Implement Asynchronous Booking Pipeline using CompletableFuture
     * <p>
     * Pipeline Steps:
     * 1. Start Stage A: CompletableFuture.supplyAsync(() -> processPayment(task), bookingThreadPool)
     * 2. Chain Stage B: .thenApplyAsync(paymentSuccess -> sendEmailNotification(task, paymentSuccess), bookingThreadPool)
     * 3. Handle Exceptions: .exceptionally(ex -> rollbackSeatReservation(task, ex))
     */
    public CompletableFuture<BookingTask> processBookingAsync(BookingTask task) {
        return CompletableFuture.supplyAsync(() -> processPayment(task), bookingThreadPool)
                .thenApplyAsync(paymentSuccess -> sendEmailNotification(task, paymentSuccess), bookingThreadPool)
                .exceptionally(ex -> rollbackSeatReservation(task, ex));
    }

    public boolean processPayment(BookingTask task) {
        System.out.println("[" + Thread.currentThread().getName() + "] Processing payment of $" + task.getAmount() + " for Booking " + task.getBookingId());
        // Simulating network payment call...
        return task.getAmount() > 0;
    }

    public BookingTask sendEmailNotification(BookingTask task, boolean paymentSuccess) {
        if (!paymentSuccess) {
            throw new IllegalStateException("Payment Failed for amount: $" + task.getAmount());
        }
        System.out.println("[" + Thread.currentThread().getName() + "] Sending Ticket Confirmation Email to " + task.getUserEmail());
        task.setStatus("CONFIRMED");
        return task;
    }

    public BookingTask rollbackSeatReservation(BookingTask task, Throwable ex) {
        System.out.println("[" + Thread.currentThread().getName() + "] Pipeline Failed: " + ex.getMessage() + ". Rolling back seat " + task.getSeatNumber());
        showSeatRepository.findByShowIdAndSeatNumber(task.getShowId(), task.getSeatNumber()).ifPresent(seat -> {
            seat.setStatus("AVAILABLE");
            showSeatRepository.saveAndFlush(seat);
        });
        task.setStatus("FAILED");
        return task;
    }
}
