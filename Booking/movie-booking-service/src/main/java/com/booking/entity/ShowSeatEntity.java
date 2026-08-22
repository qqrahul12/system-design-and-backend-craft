package com.booking.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "show_seats", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"show_id", "seat_number"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowSeatEntity {

    @Id
    @Column(name = "id")
    private String id; // e.g. "SHOW101:A1"

    @Column(name = "show_id", nullable = false)
    private String showId;

    @Column(name = "seat_number", nullable = false)
    private String seatNumber; // e.g. "A1"

    @Column(name = "seat_category")
    private String seatCategory; // "VIP", "REGULAR"

    @Column(name = "status", nullable = false)
    private String status; // "AVAILABLE", "RESERVED", "BOOKED"

    @Column(name = "price", nullable = false)
    private double price;

    @Version
    @Column(name = "version")
    private Long version; // Optimistic Locking Version
}
