package com.skills.fc.exception;

import java.util.UUID;

public class OutOfStockException extends RuntimeException {
    final static String errorMessage = "%d quantity of %s item is required but only %d is available";
    public OutOfStockException(String message) {
        super(message);
    }
    public OutOfStockException(String id, int aQty, int rQty) {
        super(errorMessage.formatted(rQty,id,aQty));
    }
}
