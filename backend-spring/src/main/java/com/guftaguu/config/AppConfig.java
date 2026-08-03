package com.guftaguu.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * General application beans — Redis template and WebClient.
 */
@Configuration
public class AppConfig {

    /**
     * StringRedisTemplate is the simplest way to interact with Redis
     * when all keys and values are plain strings (our use case).
     * Configured automatically via spring.data.redis.url in application.properties.
     */
    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory factory) {
        return new StringRedisTemplate(factory);
    }

    /**
     * WebClient builder for async HTTP calls (Discord webhook).
     */
    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }
}
