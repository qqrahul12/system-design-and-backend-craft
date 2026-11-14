package com.skills.ai.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.StandardEnvironment;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class DatabaseEnvironmentPostProcessorTest {

    @Test
    void testSanitizesMultiLineDatasourceUrlAndExtractsCredentials() {
        ConfigurableEnvironment env = new StandardEnvironment();
        String corruptedUrl = "jdbc:postgresql://cinemind-low-grain.bulrush.cloud.layerbase.dev:5432/cinemind?sslmode=require\nSPRING_DATASOURCE_USERNAME=postgres\nSPRING_DATASOURCE_PASSWORD=secret";
        env.getPropertySources().addFirst(new org.springframework.core.env.MapPropertySource("testEnv", Map.of(
                "SPRING_DATASOURCE_URL", corruptedUrl
        )));

        DatabaseEnvironmentPostProcessor processor = new DatabaseEnvironmentPostProcessor();
        processor.postProcessEnvironment(env, new SpringApplication());

        String sanitizedUrl = env.getProperty("spring.datasource.url");
        String username = env.getProperty("spring.datasource.username");
        String password = env.getProperty("spring.datasource.password");

        assertNotNull(sanitizedUrl);
        assertEquals("jdbc:postgresql://cinemind-low-grain.bulrush.cloud.layerbase.dev:5432/cinemind?sslmode=require", sanitizedUrl);
        assertEquals("postgres", username);
        assertEquals("secret", password);
    }
}
