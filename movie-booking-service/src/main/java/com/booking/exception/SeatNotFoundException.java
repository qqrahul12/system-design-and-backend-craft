package com.booking.exception;

public class SeatNotFoundException extends RuntimeException {

    private final static String SEAT_NOT_FOUND = "Seat Not Found: ";
    public SeatNotFoundException(String seatId) {
        super(SEAT_NOT_FOUND + seatId);
    }
    public SeatNotFoundException(String seatId, String message) {
        super(message + seatId);
    }
}
