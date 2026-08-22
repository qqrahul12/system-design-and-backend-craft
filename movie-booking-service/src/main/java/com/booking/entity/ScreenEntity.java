package com.booking.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "screens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScreenEntity {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "theatre_id", nullable = false)
    private String theatreId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "total_seats", nullable = false)
    private int totalSeats;
}
