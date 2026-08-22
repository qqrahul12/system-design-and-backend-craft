package com.booking.cache.impl.lru;

public class LruEmptyException extends RuntimeException {
    public LruEmptyException(String message) {
        super(message);
    }
}
