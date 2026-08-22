package com.authservice.web.dto;

public record ApiResponse<T>(
        boolean success,
        String status,
        T data,
        String error
) {
    public static <T> ApiResponse<T> ok(String status, T data) {
        return new ApiResponse<>(true, status, data, null);
    }

    public static <T> ApiResponse<T> error(String error) {
        return new ApiResponse<>(false, "FAILED", null, error);
    }
}
