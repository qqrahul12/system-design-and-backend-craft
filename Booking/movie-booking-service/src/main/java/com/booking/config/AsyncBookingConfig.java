package com.booking.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.*;

@Configuration
public class AsyncBookingConfig {

    /**
     * Bounded ThreadPoolExecutor with ArrayBlockingQueue and CallerRunsPolicy backpressure
     */
    @Bean(name = "bookingThreadPool")
    public ExecutorService bookingThreadPool() {
        return new ThreadPoolExecutor(
                5,                             // Core Pool Size
                20,                            // Maximum Pool Size
                60L, TimeUnit.SECONDS,         // Keep Alive Time
                new ArrayBlockingQueue<>(100), // Bounded Queue Size
                Executors.defaultThreadFactory(),
                new ThreadPoolExecutor.CallerRunsPolicy() // Backpressure Policy
        );
    }

    /**
     * Java 21 Virtual Thread Executor (Project Loom)
     */
    @Bean(name = "virtualThreadExecutor")
    public ExecutorService virtualThreadExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}
