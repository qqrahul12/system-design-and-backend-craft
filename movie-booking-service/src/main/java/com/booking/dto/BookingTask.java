package com.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingTask {
    private String bookingId;
    private String showId;
    private String seatNumber;
    private String userEmail;
    private double amount;
    private String status; // "PENDING", "CONFIRMED", "FAILED"
}
