package com.skills.fc.exception;

import java.util.UUID;

public class MenuItemNotFound extends RuntimeException {
    final static String errorMessage = "Menu Item %s doesn't exist";
    public MenuItemNotFound(String message) {
        super(message);
    }

    public MenuItemNotFound(UUID id) {
        super(errorMessage.formatted(id.toString()));
    }
}
