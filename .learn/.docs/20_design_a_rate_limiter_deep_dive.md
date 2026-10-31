# 🚦 Design A Rate Limiter (Deep Dive)

A rate limiter controls the rate of traffic sent by a client or a service. In the HTTP world, it limits the number of client requests allowed over a specified period. If the API request count exceeds the threshold, excess calls are blocked.

## 🌟 Benefits of an API Rate Limiter
1. **Prevent Resource Starvation (DoS):** Prevents intentional or unintentional Denial of Service attacks by blocking excess calls.
2. **Reduce Cost:** Essential for companies using paid third-party APIs (e.g., charging per credit-check). Limits prevent unexpected billing spikes.
3. **Prevent Server Overload:** Filters out excess requests caused by bots or misbehaving users to maintain system stability.

---

## 🏗️ 1. Where to put the Rate Limiter?
* **Client-side:** Unreliable. Client requests can easily be forged, and you may lack control over the client code.
* **Server-side:** Implemented directly within your API servers.
* **Middleware / API Gateway:** The most common modern approach. An API Gateway (like Kong, AWS API Gateway) intercepts requests and returns `HTTP 429 (Too Many Requests)` before they ever reach your backend servers. 

> [!TIP]
> **Rule of Thumb:** If you already use a microservice architecture with an API Gateway, put the rate limiter there. If you have limited engineering resources, buy a commercial gateway. Otherwise, build it server-side for maximum control.

---

## 🧮 2. Rate Limiting Algorithms

### A. Token Bucket
Tokens are added to a bucket at a preset rate. Each request consumes one token. If the bucket is empty, the request is dropped.
* **Used By:** Amazon, Stripe.
* **Pros:** Easy to implement, memory-efficient, allows for short bursts of traffic.
* **Cons:** Challenging to tune both the bucket size and the token refill rate perfectly.

### B. Leaking Bucket
Similar to token bucket but processes requests at a strictly fixed rate using a FIFO queue.
* **Used By:** Shopify.
* **Pros:** Memory efficient (limited queue size), smooths out outflow rate.
* **Cons:** A burst of traffic can fill the queue with old requests, starving newer requests.

### C. Fixed Window Counter
Divides the timeline into fixed-size windows (e.g., 1:00 to 1:01). Increments a counter for each request.
* **Pros:** Memory efficient, resets easily at the end of the window.
* **Cons:** **The Edge Case Spike.** A burst of traffic at the edges of time windows (e.g., 1:00:59 and 1:01:01) could allow *double* the allowed quota to pass through in a very short span.

### D. Sliding Window Log
Stores the timestamp of *every* request (usually in Redis Sorted Sets). Removes outdated timestamps before checking the log size against the limit.
* **Pros:** Extremely accurate. A rolling window never exceeds the limit.
* **Cons:** **Memory heavy.** It stores timestamps even for rejected requests.

### E. Sliding Window Counter
A hybrid approach. Calculates requests in the rolling window using the formula: 
`Requests in current window + (requests in previous window * overlap percentage)`
* **Pros:** Smooths out traffic spikes, memory efficient.
* **Cons:** An approximation. It assumes requests in the previous window were evenly distributed (though Cloudflare found this to be 99.99% accurate in practice).

---

## 🛠️ 3. High-Level Architecture & Redis

Rate limiting requires fast data access, so databases are too slow. **In-memory caches like Redis** are the industry standard.
* **`INCR` command:** Increases the stored counter by 1.
* **`EXPIRE` command:** Sets a timeout for the counter so it automatically deletes when the window ends.

### Handling Throttled Requests
When a request is rate-limited, the server returns an **HTTP 429 Too Many Requests**. You should also return HTTP Headers to help the client:
* `X-Ratelimit-Remaining`: Remaining allowed requests in this window.
* `X-Ratelimit-Limit`: The total limit per window.
* `X-Ratelimit-Retry-After`: Seconds to wait before retrying.

*(Optional: Throttled requests for critical systems like order processing can be enqueued to a Message Queue like Kafka to be processed later instead of being dropped).*

---

## 🌐 4. Distributed Environment Challenges

Scaling a rate limiter across multiple servers introduces two massive challenges:

### Challenge 1: Race Conditions
If two servers concurrently read a Redis counter at `3`, and both increment it, the final value might be `4` instead of `5`.
* **Solution:** Do not use heavy distributed locks. Instead, use **Redis Lua Scripts** (which execute atomically) or **Redis Sorted Sets**.

### Challenge 2: Synchronization
If Client A routes to Rate Limiter Node 1, and then routes to Node 2, the nodes must share the same counter.
* **Solution:** **Centralized Data Store**. Do not use Sticky Sessions. All rate limiter nodes should read/write to a centralized Redis cluster.

---

## ⚡ 5. Performance & Additional Optimizations
1. **Multi-Data Center / Edge Computing:** Deploy rate limiters at Edge Servers (like Cloudflare does) to reduce latency for users located far from your primary data center.
2. **Layer 7 vs Layer 3:** We focused on Layer 7 (Application / HTTP). You can also rate limit at Layer 3 (Network) using `Iptables` to block malicious IP addresses completely before they even reach the application layer.
3. **Client Best Practices:** Clients should cache data to avoid API calls, gracefully catch 429 exceptions, and implement **Exponential Backoff and Retry** logic.

---

## 📚 6. Reference Materials & Further Reading
For deeper dives into industry implementations, refer to the following engineering blogs and resources:
* **Stripe:** [Stripe rate limiters](https://stripe.com/blog/rate-limiters)
* **Cloudflare:** [How we built rate limiting capable of scaling to millions of domains](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)
* **Google Cloud:** [Rate-limiting strategies and techniques](https://cloud.google.com/solutions/rate-limiting-strategies-techniques)
* **Shopify:** [REST Admin API rate limits](https://help.shopify.com/en/api/reference/rest-admin-api-rate-limits)
* **ClassDojo:** [Better Rate Limiting With Redis Sorted Sets](https://engineering.classdojo.com/blog/2015/02/06/rolling-rate-limiter/)
* **Lyft:** [Lyft rate limiting GitHub Repository](https://github.com/lyft/ratelimit)
* **AWS:** [Throttle API requests for better throughput (API Gateway)](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
