package com.booking.service;

import com.booking.entity.ShowSeatEntity;
import com.booking.exception.SeatNotFoundException;
import com.booking.repository.ShowSeatRepository;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.TimeUnit;

@Service
public class SeatReservationService {

    private final ShowSeatRepository showSeatRepository;
    private final RedissonClient redissonClient;

    private static final String RESERVED = "RESERVED";
    private static final String SEAT_NOT_AVAILABLE = "Seat Not Available: ";
    private static final String CONCURRENT_SEAT_BOOKED = "Please book another seat. This seat is not available: ";

    public SeatReservationService(ShowSeatRepository showSeatRepository,
                                  @Autowired(required = false) RedissonClient redissonClient) {
        this.showSeatRepository = showSeatRepository;
        this.redissonClient = redissonClient;
    }

    /**
     * 1. Optimistic Locking Reservation scoped to specific Show and Seat Number
     */
    @Transactional
    public void reserveShowSeatOptimistic(String showId, String seatNumber) {
        try {
            ShowSeatEntity seat = showSeatRepository.findByShowIdAndSeatNumber(showId, seatNumber).orElse(null);
            validateSeatStatus(seat, showId, seatNumber);
            seat.setStatus(RESERVED);
            showSeatRepository.saveAndFlush(seat);
        } catch (OptimisticLockingFailureException e) {
            throw new SeatNotFoundException(showId + ":" + seatNumber, CONCURRENT_SEAT_BOOKED);
        }
    }

    /**
     * 2. Pessimistic Locking Reservation scoped to specific Show and Seat Number (SELECT ... FOR UPDATE)
     */
    @Transactional
    public void reserveShowSeatPessimistic(String showId, String seatNumber) {
        try {
            ShowSeatEntity seat = showSeatRepository.findByShowIdAndSeatNumberPessimistic(showId, seatNumber).orElse(null);
            validateSeatStatus(seat, showId, seatNumber);
            seat.setStatus(RESERVED);
            showSeatRepository.saveAndFlush(seat);
        } catch (PessimisticLockingFailureException e) {
            throw new SeatNotFoundException(showId + ":" + seatNumber, CONCURRENT_SEAT_BOOKED);
        }
    }

    /**
     * 3. TODO: Redisson Distributed Lock Reservation scoped to specific Show and Seat Number
     * Lock Key Formula: "lock:show:" + showId + ":seat:" + seatNumber
     */
    public ShowSeatEntity reserveShowSeatRedisson(String showId, String seatNumber) {
        String lockKey = getRedisLockKey(showId, seatNumber);
        RLock lock = redissonClient.getLock(lockKey);
        boolean isAcquired = false;
        try {
            isAcquired = lock.tryLock(5, 10, TimeUnit.SECONDS);
            if (!isAcquired) {
                throw new SeatNotFoundException(showId + ":" + seatNumber, CONCURRENT_SEAT_BOOKED);
            }
            ShowSeatEntity seat = showSeatRepository.findByShowIdAndSeatNumber(showId, seatNumber).orElse(null);
            validateSeatStatus(seat, showId, seatNumber);
            seat.setStatus(RESERVED);
            return showSeatRepository.saveAndFlush(seat);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new SeatNotFoundException(showId + ":" + seatNumber,  CONCURRENT_SEAT_BOOKED);
        } finally {
            if (isAcquired && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    public String getRedisLockKey(String showId, String seatNumber) {
        return "lock:show:" + showId + ":seat:" + seatNumber;
    }

    private void validateSeatStatus(ShowSeatEntity seat, String showId, String seatNumber) {
        if (seat == null) {
            throw new SeatNotFoundException(showId + ":" + seatNumber);
        }
        if (!"AVAILABLE".equalsIgnoreCase(seat.getStatus())) {
            throw new SeatNotFoundException(showId + ":" + seatNumber, SEAT_NOT_AVAILABLE);
        }
    }
}
