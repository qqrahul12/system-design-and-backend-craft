package com.skills.ai.config;

import io.lettuce.core.ClientOptions;
import io.lettuce.core.SslOptions;
import io.lettuce.core.protocol.ProtocolVersion;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.data.redis.LettuceClientConfigurationBuilderCustomizer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

/**
 * Enterprise configuration for Redis distributed caching, seat locking, and cluster pub/sub.
 * Configures Lettuce client with TLS SNI support required by cloud providers (Layerbase).
 * Provides RedisCacheManager with explicit TTLs and JSON serialization for fast sub-millisecond retrieval.
 */
@Slf4j
@Configuration
@EnableCaching
public class RedisConfig {

    @Value("${spring.data.redis.ssl.enabled:true}")
    private boolean sslEnabled;

    @Value("${spring.data.redis.host:cinecache-numb-cross.bulrush.cloud.layerbase.dev}")
    private String redisHost;

    @Bean
    public LettuceClientConfigurationBuilderCustomizer lettuceClientConfigurationBuilderCustomizer() {
        return clientConfigurationBuilder -> {
            if (sslEnabled) {
                log.info("🔐 Enabling TLS with SNI for Redis host: {}", redisHost);
                SslOptions sslOptions = SslOptions.builder()
                        .jdkSslProvider()
                        .build();

                ClientOptions clientOptions = ClientOptions.builder()
                        .sslOptions(sslOptions)
                        .protocolVersion(ProtocolVersion.RESP3)
                        .disconnectedBehavior(ClientOptions.DisconnectedBehavior.REJECT_COMMANDS)
                        .autoReconnect(true)
                        .build();

                clientConfigurationBuilder.useSsl();
                clientConfigurationBuilder.clientOptions(clientOptions);
            }
        };
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        return new StringRedisTemplate(connectionFactory);
    }

    @Bean
    public org.springframework.data.redis.listener.RedisMessageListenerContainer redisMessageListenerContainer(
            RedisConnectionFactory connectionFactory
    ) {
        org.springframework.data.redis.listener.RedisMessageListenerContainer container =
                new org.springframework.data.redis.listener.RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        return container;
    }

    @Bean
    public org.springframework.data.redis.listener.ChannelTopic seatEventsTopic() {
        return new org.springframework.data.redis.listener.ChannelTopic("cinemind:topic:seats");
    }

    @Bean
    public org.springframework.data.redis.listener.ChannelTopic orderEventsTopic() {
        return new org.springframework.data.redis.listener.ChannelTopic("cinemind:topic:orders");
    }

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(15))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()))
                .disableCachingNullValues();

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withCacheConfiguration("movies", defaultConfig.entryTtl(Duration.ofMinutes(30)))
                .withCacheConfiguration("concessions", defaultConfig.entryTtl(Duration.ofMinutes(30)))
                .withCacheConfiguration("analytics", defaultConfig.entryTtl(Duration.ofMinutes(5)))
                .build();
    }
}
