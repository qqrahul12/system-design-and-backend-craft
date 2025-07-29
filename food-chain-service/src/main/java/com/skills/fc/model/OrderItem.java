package com.skills.fc.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@NoArgsConstructor @Getter @Setter
public class OrderItem {

    @Id
    @GeneratedValue
    UUID orderItemId;

    @OneToOne
    @JoinColumn(name = "menu_item_id")
    MenuItem menuItem;

    int orderQuantity;

    @ManyToOne(fetch = FetchType.LAZY)
            @JoinColumn(name = "order_id", nullable = false)
    Order order;

    public OrderItem(MenuItem item, int orderQuantity) {
        this.menuItem = item;
        this.orderQuantity = orderQuantity;
    }
}
