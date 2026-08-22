package com.booking.ratelimit;

import com.booking.config.RateLimiterConfig;
import com.booking.ratelimit.filter.RateLimitingFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = {RateLimitingFilterTest.TestConfig.class, RateLimitingFilter.class, RateLimiterConfig.class})
@AutoConfigureMockMvc
public class RateLimitingFilterTest {

    @SpringBootApplication
    @RestController
    static class TestConfig {
        @GetMapping("/api/test-rate-limit")
        public String testEndpoint() {
            return "SUCCESS";
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Integration Test: HTTP Requests Exceeding Rate Limit Receive 429 Too Many Requests")
    void testRateLimitingFilterThrottling() throws Exception {
        String clientIp = "203.0.113.195";

        // 1. First 10 Requests must return HTTP 200 OK
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(get("/api/test-rate-limit")
                            .header("X-Forwarded-For", clientIp))
                    .andExpect(status().isOk());
        }

        // 2. 11th Request must return HTTP 429 Too Many Requests!
        mockMvc.perform(get("/api/test-rate-limit")
                        .header("X-Forwarded-For", clientIp))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.message").value("Rate limit exceeded. Please try again later."));
    }
}
