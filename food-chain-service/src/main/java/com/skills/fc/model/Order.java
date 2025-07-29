package com.skills.fc.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order {

    @GeneratedValue
    @Id
    UUID orderId;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    List<OrderItem> orderItemList;

    LocalDateTime orderTime;

    UUID customerId;
    BigDecimal orderAmount;

    public Order(List<OrderItem> orderItemList, UUID customerId, BigDecimal orderAmount) {
        this.orderItemList = orderItemList;
        this.customerId = customerId;
        this.orderAmount = orderAmount;
        this.orderTime = LocalDateTime.now();
    }
}
