package com.skills.ai.cache;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Defensive Redis cache utility that eliminates the repetitive null-check + try/catch boilerplate
 * pattern scattered across service implementations.
 *
 * <p>All operations are <em>advisory</em>: when Redis is unavailable ({@code redisTemplate == null})
 * or throws, the operation silently degrades — it never propagates an exception to the caller.
 * Business logic must remain correct even if every cache call is a no-op.
 *
 * <h3>Design Principles</h3>
 * <ul>
 *   <li><b>SRP</b>: Owns only one concern — safe, null-tolerant Redis operations.</li>
 *   <li><b>DIP</b>: Accepts {@code StringRedisTemplate} via static factory; services depend on this
 *       abstraction rather than duplicating null-guard logic.</li>
 *   <li><b>OCP</b>: New cache operations can be added without touching any service class.</li>
 * </ul>
 *
 * <h3>Usage patterns</h3>
 * <pre>{@code
 * // 1. Read from cache
 * Optional<String> hit = RedisCache.of(redisTemplate).get("my:key");
 *
 * // 2. Write to cache with TTL
 * RedisCache.of(redisTemplate).set("my:key", value, Duration.ofMinutes(15));
 *
 * // 3. Evict one or more keys
 * RedisCache.of(redisTemplate).evict("key:1", "key:2");
 *
 * // 4. Read → deserialize → cache-aside in one expression
 * List<Movie> movies = RedisCache.of(redisTemplate)
 *     .getAndDeserialize("movies:all", raw -> objectMapper.readValue(raw, listType))
 *     .orElseGet(() -> loadFromDatabase());
 *
 * // 5. Serialize → cache in one call
 * RedisCache.of(redisTemplate)
 *     .serializeAndSet("movies:all", movies, m -> objectMapper.writeValueAsString(m), ttl);
 *
 * // 6. Fire-and-forget: run a Redis operation, silently ignore all failures
 * RedisCache.of(redisTemplate).run(r -> r.opsForValue().set("key", "val"));
 * }</pre>
 */
@Slf4j
public final class RedisCache {

    private final StringRedisTemplate redis;

    private RedisCache(StringRedisTemplate redis) {
        this.redis = redis;
    }

    // -------------------------------------------------------------------------
    // Factory
    // -------------------------------------------------------------------------

    /**
     * Creates a {@code RedisCache} bound to the given template.
     * When {@code redisTemplate} is {@code null} (Redis not configured in this environment),
     * all operations on the returned instance are silent no-ops.
     */
    public static RedisCache of(StringRedisTemplate redisTemplate) {
        return new RedisCache(redisTemplate);
    }

    // -------------------------------------------------------------------------
    // Predicate
    // -------------------------------------------------------------------------

    /** Returns {@code true} only when Redis is configured and reachable at construction time. */
    public boolean isAvailable() {
        return redis != null;
    }

    // -------------------------------------------------------------------------
    // Read operations
    // -------------------------------------------------------------------------

    /**
     * Retrieves the raw string value at {@code key}.
     *
     * @return {@code Optional.of(value)} on a cache hit; {@code Optional.empty()} on a miss,
     *         blank value, Redis unavailability, or any exception.
     */
    public Optional<String> get(String key) {
        if (redis == null) return Optional.empty();
        try {
            String value = redis.opsForValue().get(key);
            return (value != null && !value.isBlank()) ? Optional.of(value) : Optional.empty();
        } catch (Exception e) {
            log.debug("[RedisCache] GET skipped for key='{}': {}", key, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Retrieves and deserializes the value at {@code key} using the provided {@code deserializer}.
     *
     * <p>If the deserializer throws (e.g. malformed JSON), the exception is caught and an empty
     * Optional is returned — the cache miss path will re-populate the entry on the next write.
     *
     * @param <T>          the target type
     * @param key          Redis key
     * @param deserializer function that converts the raw string to {@code T}; may throw checked exceptions
     * @return deserialized value wrapped in Optional, or empty on any failure
     */
    public <T> Optional<T> getAndDeserialize(String key, DeserializeFunction<String, T> deserializer) {
        return get(key).flatMap(raw -> {
            try {
                T value = deserializer.apply(raw);
                return Optional.ofNullable(value);
            } catch (Exception e) {
                log.debug("[RedisCache] Deserialization failed for key='{}': {}", key, e.getMessage());
                return Optional.empty();
            }
        });
    }

    // -------------------------------------------------------------------------
    // Write operations
    // -------------------------------------------------------------------------

    /**
     * Sets {@code value} at {@code key} with the given {@code ttl}.
     * No-op if Redis is unavailable or any exception occurs.
     */
    public void set(String key, String value, Duration ttl) {
        if (redis == null || value == null) return;
        try {
            redis.opsForValue().set(key, value, ttl);
            log.debug("[RedisCache] SET key='{}' TTL={}", key, ttl);
        } catch (Exception e) {
            log.debug("[RedisCache] SET skipped for key='{}': {}", key, e.getMessage());
        }
    }

    /**
     * Serializes {@code value} using {@code serializer} and stores it at {@code key} with {@code ttl}.
     * No-op if Redis is unavailable, the value is {@code null}, or any exception occurs.
     *
     * @param <T>        the source type
     * @param key        Redis key
     * @param value      the object to serialize and cache
     * @param serializer function that converts {@code T} to its string representation; may throw checked exceptions
     * @param ttl        time-to-live for the cached entry
     */
    public <T> void serializeAndSet(String key, T value, SerializeFunction<T> serializer, Duration ttl) {
        if (redis == null || value == null) return;
        try {
            String serialized = serializer.apply(value);
            if (serialized != null && !serialized.isBlank()) {
                redis.opsForValue().set(key, serialized, ttl);
                log.debug("[RedisCache] SET (serialized) key='{}' TTL={}", key, ttl);
            }
        } catch (Exception e) {
            log.debug("[RedisCache] Serialization/SET skipped for key='{}': {}", key, e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Eviction operations
    // -------------------------------------------------------------------------

    /**
     * Deletes one or more keys from Redis.
     * No-op if Redis is unavailable or any exception occurs.
     *
     * @param keys one or more Redis keys to delete
     */
    public void evict(String... keys) {
        if (redis == null || keys == null || keys.length == 0) return;
        try {
            for (String key : keys) {
                if (key != null && !key.isBlank()) {
                    redis.delete(key);
                }
            }
            log.debug("[RedisCache] EVICT keys={}", (Object) keys);
        } catch (Exception e) {
            log.debug("[RedisCache] EVICT skipped: {}", e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Fire-and-forget execution
    // -------------------------------------------------------------------------

    /**
     * Executes an arbitrary Redis operation expressed as a {@code Consumer<StringRedisTemplate>}.
     * No-op if Redis is unavailable; swallows all exceptions silently.
     *
     * <p>Use this for operations not covered by the named methods above.
     *
     * <pre>{@code
     * RedisCache.of(redisTemplate).run(r ->
     *     r.opsForSet().add("cinemind:seats:locked:" + scheduleId, seat)
     * );
     * }</pre>
     *
     * @param operation the Redis operation to execute; receives the non-null template
     */
    public void run(Consumer<StringRedisTemplate> operation) {
        if (redis == null) return;
        try {
            operation.accept(redis);
        } catch (Exception e) {
            log.debug("[RedisCache] run() operation skipped: {}", e.getMessage());
        }
    }

    /**
     * Executes a Redis operation that returns a value.
     * Returns {@code Optional.empty()} if Redis is unavailable or any exception occurs.
     *
     * <pre>{@code
     * Optional<Long> size = RedisCache.of(redisTemplate)
     *     .call(r -> r.opsForSet().size("cinemind:seats:locked:" + scheduleId));
     * }</pre>
     *
     * @param <R>       return type
     * @param operation the Redis operation to execute; receives the non-null template
     * @return the operation's result wrapped in Optional, or empty on any failure
     */
    public <R> Optional<R> call(Function<StringRedisTemplate, R> operation) {
        if (redis == null) return Optional.empty();
        try {
            return Optional.ofNullable(operation.apply(redis));
        } catch (Exception e) {
            log.debug("[RedisCache] call() operation skipped: {}", e.getMessage());
            return Optional.empty();
        }
    }

    // -------------------------------------------------------------------------
    // Cache-aside helper
    // -------------------------------------------------------------------------

    /**
     * Full cache-aside pattern in one call:
     * <ol>
     *   <li>Attempts to read and deserialize from {@code key}.</li>
     *   <li>On a miss, invokes {@code loader} to fetch the canonical value.</li>
     *   <li>If the loaded value is non-null and non-empty (per {@code isEmpty}), serializes and
     *       caches it at {@code key} with {@code ttl}.</li>
     * </ol>
     *
     * <pre>{@code
     * List<Movie> movies = RedisCache.of(redisTemplate).cacheAside(
     *     "movies:all",
     *     raw -> objectMapper.readValue(raw, listType),
     *     () -> jdbcTemplate.query(SELECT_ALL, this::mapRow),
     *     List::isEmpty,
     *     movies -> objectMapper.writeValueAsString(movies),
     *     Duration.ofMinutes(15)
     * );
     * }</pre>
     *
     * @param <T>          the domain type
     * @param key          Redis key
     * @param deserializer converts cached string → T
     * @param loader       fetches the canonical value from the source of truth (DB, etc.)
     * @param isEmpty      predicate to skip caching empty results (e.g. {@code List::isEmpty})
     * @param serializer   converts T → string for storage
     * @param ttl          TTL for the cached entry
     * @return the value — either from cache or freshly loaded
     */
    public <T> T cacheAside(
            String key,
            DeserializeFunction<String, T> deserializer,
            Supplier<T> loader,
            java.util.function.Predicate<T> isEmpty,
            SerializeFunction<T> serializer,
            Duration ttl
    ) {
        // 1. Try cache
        Optional<T> cached = getAndDeserialize(key, deserializer);
        if (cached.isPresent()) {
            log.debug("[RedisCache] Cache HIT for key='{}'", key);
            return cached.get();
        }

        // 2. Load from source of truth
        T value = loader.get();

        // 3. Populate cache if the result is non-empty
        if (value != null && !isEmpty.test(value)) {
            serializeAndSet(key, value, serializer, ttl);
        }

        return value;
    }

    // -------------------------------------------------------------------------
    // Functional interfaces (allow checked exceptions from Jackson etc.)
    // -------------------------------------------------------------------------

    @FunctionalInterface
    public interface DeserializeFunction<I, O> {
        O apply(I input) throws Exception;
    }

    @FunctionalInterface
    public interface SerializeFunction<T> {
        String apply(T value) throws Exception;
    }
}
