package com.booking.config;

import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class Resilience4jConfig {

    @Bean
    public CircuitBreakerRegistry circuitBreakerRegistry() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
                .failureRateThreshold(50) // Trip OPEN if 50% calls fail
                .slidingWindowSize(5)      // Monitor rolling window of 5 calls
                .minimumNumberOfCalls(5)   // Minimum calls before computing failure rate
                .waitDurationInOpenState(Duration.ofSeconds(2)) // Cooldown before HALF_OPEN
                .permittedNumberOfCallsInHalfOpenState(2)       // Trial calls in HALF_OPEN
                .build();

        return CircuitBreakerRegistry.of(config);
    }
}
