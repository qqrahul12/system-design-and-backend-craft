package com.skills.fc.controller;

import com.skills.fc.exception.MenuItemNotFound;
import com.skills.fc.exception.OutOfStockException;
import com.skills.fc.model.Order;
import com.skills.fc.requestDTO.CreateOrderRequest;
import com.skills.fc.service.OrderService;
import jakarta.persistence.PersistenceException;
import lombok.RequiredArgsConstructor;
import org.apache.coyote.BadRequestException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/orders")
public class OrderController {

    OrderService orderService;
    @PostMapping
    public ResponseEntity createOrder(@RequestBody CreateOrderRequest cor) throws BadRequestException {
        if(cor.orderItemList().isEmpty() || cor.customerId() == null) {
            throw new BadRequestException("Add items to place a order");
        }
        Order o = orderService.createOrder(cor);
        return new ResponseEntity<>(o, HttpStatus.CREATED);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<String> handleInvalidArgument(BadRequestException bre) {
        return new ResponseEntity<>(bre.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MenuItemNotFound.class)
    public ResponseEntity<String> handleItemNotFound(MenuItemNotFound minf) {
        return new ResponseEntity<>(minf.getMessage(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(OutOfStockException.class)
    public ResponseEntity<String> handleOutOfStock(OutOfStockException oos) {
        return new ResponseEntity<>(oos.getMessage(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(PersistenceException.class)
    public ResponseEntity<String> handleInternalError(PersistenceException pe) {
        return new ResponseEntity<>(pe.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleError(Exception e) {
        e.printStackTrace();
        return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }

}
