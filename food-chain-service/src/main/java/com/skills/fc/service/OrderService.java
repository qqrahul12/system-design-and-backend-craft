package com.skills.fc.service;

import com.skills.fc.exception.MenuItemNotFound;
import com.skills.fc.exception.OutOfStockException;
import com.skills.fc.model.MenuItem;
import com.skills.fc.model.OrderItem;
import com.skills.fc.repository.MenuRepository;
import com.skills.fc.repository.OrderRepository;
import com.skills.fc.model.Order;
import com.skills.fc.requestDTO.CreateOrderRequest;
import com.skills.fc.requestDTO.OrderItemRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.PersistenceException;
import jakarta.persistence.Query;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional
public class OrderService {
    final OrderRepository orderRepository;
    final MenuRepository menuRepository;

    @PersistenceContext
    EntityManager entityManager;

    @Autowired
    public OrderService(OrderRepository orderRepository, MenuRepository menuRepository) {
        this.orderRepository = orderRepository;
        this.menuRepository = menuRepository;
    }

    public Order createOrder(CreateOrderRequest cor) {
        try {
            List<OrderItem> orderItems = new ArrayList<>();
            for (OrderItemRequest oi : cor.orderItemList()) {
                Optional<MenuItem> item = menuRepository.findByIdForUpdate(UUID.fromString(oi.id()));
                if (item.isEmpty()) {
                    throw new MenuItemNotFound(oi.id());
                }
                MenuItem mi = item.get();
                if (mi.getAvailableQuantity() < oi.qty())
                    throw new OutOfStockException(oi.id(), mi.getAvailableQuantity(), oi.qty());
                orderItems.add(new OrderItem(mi, oi.qty()));
            }
            updateMenuItemStockBatch(orderItems);
            Order order = new Order(orderItems, cor.customerId(), cor.orderAmount());
            return orderRepository.save(order);
        } catch (MenuItemNotFound | OutOfStockException ex) {
            throw ex;
        } catch (PersistenceException pe) {
            throw new RuntimeException("Database operation failed during order creation", pe);
        } catch (Exception ex) {
            throw new RuntimeException("Unexpected error occurred while creating order", ex);
        }
    }

    @Transactional
    void updateMenuItemStockBatch(List<OrderItem> orderItems) {
        try {
            if (orderItems == null || orderItems.isEmpty()) return;
            StringBuilder sql = new StringBuilder(
                    "UPDATE menu_item SET available_quantity = available_quantity - CASE"
            );

            Map<String, Object> params = new HashMap<>();
            List<String> idPlaceholders = new ArrayList<>();

            for (int i = 0; i < orderItems.size(); i++) {
                OrderItem item = orderItems.get(i);
                UUID id = item.getMenuItem().getMenuItemId();
                int qty = item.getOrderQuantity();

                String idKey = "id" + i;
                String qtyKey = "qty" + i;

                sql.append(" WHEN id = :").append(idKey).append(" THEN :").append(qtyKey);
                params.put(idKey, id);
                params.put(qtyKey, qty);
                idPlaceholders.add(":" + idKey);
            }

            sql.append(" ELSE 0 END WHERE id IN (")
                    .append(String.join(", ", idPlaceholders))
                    .append(")");

            Query query = entityManager.createNativeQuery(sql.toString());

            for (Map.Entry<String, Object> entry : params.entrySet()) {
                query.setParameter(entry.getKey(), entry.getValue());
            }

            query.executeUpdate();
        } catch (PersistenceException pe) {
            throw new RuntimeException("Failed to update menu item stock in batch", pe);
        } catch (Exception ex) {
            throw new RuntimeException("Unexpected error during stock update", ex);
        }
    }
}
