package com.skills.fc.requestDTO;

import com.skills.fc.model.OrderItem;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateOrderRequest(List<OrderItemRequest> orderItemList, UUID customerId, BigDecimal orderAmount) {
}
