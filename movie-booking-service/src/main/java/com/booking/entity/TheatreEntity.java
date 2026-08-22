package com.booking.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "theatres")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TheatreEntity {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "city", nullable = false)
    private String city;
}
