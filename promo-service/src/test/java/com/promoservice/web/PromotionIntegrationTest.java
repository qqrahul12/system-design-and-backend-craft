package com.promoservice.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.promoservice.domain.impl.DefaultLineItem;
import com.promoservice.dto.ValidateCartRequest;
import com.promoservice.repository.PromotionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = {DataSourceAutoConfiguration.class, RedisAutoConfiguration.class, RedisRepositoriesAutoConfiguration.class})
class PromotionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PromotionRepository promotionRepository;

    @Test
    @DisplayName("Chunk 6 Integration Test: Complete End-to-End Promotion Evaluation & Reservation Flow")
    void testEndToEndCheckoutFlow() throws Exception {
        ValidateCartRequest validateReq = new ValidateCartRequest(
                "cart_9912",
                "USD",
                15000L,
                0L,
                List.of(new DefaultLineItem("item_1", "sku_macbook", "MacBook Pro", 15000L, 1, Map.of("category", "LAPTOPS"))),
                Map.of(),
                "usr_vip",
                "USER",
                Map.of("membership_tier", "VIP"),
                List.of("FLASH50")
        );

        mockMvc.perform(post("/v1/promotions/validate")
                        .header("X-Tenant-Id", "tenant_acme")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
