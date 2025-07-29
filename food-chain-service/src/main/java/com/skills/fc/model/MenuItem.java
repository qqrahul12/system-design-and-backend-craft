package com.skills.fc.model;

import com.skills.fc.exception.OutOfStockException;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.AutoConfiguration;

import java.math.BigDecimal;
import java.util.UUID;


@Entity
@Getter @Setter
public class MenuItem {
    @Id @GeneratedValue
    UUID menuItemId;

    private String name;
    private String description;
    private BigDecimal unitPrice;
    private int availableQuantity;

    @Version  // Optimistic locking
    int version;

    public MenuItem(String name, BigDecimal unitPrice) {
        this.name = name;
        this.unitPrice = unitPrice;
    }

    synchronized void reduceStock(int requiredQty) throws OutOfStockException {
        if(availableQuantity < requiredQty) {
            throw new OutOfStockException(menuItemId.toString(), availableQuantity, requiredQty);
        }
        this.availableQuantity -= requiredQty;
    }
}
