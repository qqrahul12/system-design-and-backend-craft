# 🏛️ System Design & Backend Craft

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.1-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Redis](https://img.shields.io/badge/Redis-Redisson-red.svg)](https://redis.io/)
[![Resilience4j](https://img.shields.io/badge/Resilience4j-2.2.0-blue.svg)](https://resilience4j.readme.io/)
[![Build](https://img.shields.io/badge/Build-SUCCESS-success.svg)](#-getting-started)

Welcome to **System Design & Backend Craft** by **Rahul Jain** ([@qqrahul12](https://github.com/qqrahul12)).

This repository is a production-grade showcase of **High-Level System Design (HLD)** architectures, **Low-Level Design (LLD)** implementations, distributed systems theory, and enterprise Java 21 / Spring Boot 3 microservices.

---

## 🎯 Featured Microservices & System Components

| Service / Module | Tech Stack | Architectural Highlights |
| :--- | :--- | :--- |
| 🎬 **`movie-booking-service`** | Java 21, Spring Boot 3, JPA, Redisson, Resilience4j | High-concurrency Flash Sales seat reservation engine with Pessimistic/Optimistic locking, Redisson Distributed Locks, Token Bucket Rate Limiter, `CompletableFuture` async checkout pipeline, and Resilience4j Circuit Breakers. |
| ⚡ **`cache`** | Java 21, Caffeine, ReentrantLock | Thread-safe handcrafted `LruCache` with sentinel nodes & `ReentrantLock`, Caffeine Cache Adapter, and Decorator Pattern implementations. |
| 🏷️ **`promo-service`** | Spring Boot, Dynamic AST Rule Engine | AST-based Rule Evaluator & Stacking Resolver for multi-tenant cart promotions and discount actions. |
| 💸 **`SplitMoney`** | Java 21, Concurrency | Multi-currency expense-sharing & bill-splitting engine (Splitwise LLD). |
| 💬 **`Chat`** | WebSockets, Spring | Real-time chat messaging server & presence management. |
| 🛵 **`food-chain-service`** | Java, Kafka, Redis Geo | High-scale location ingestion & driver dispatch matching engine. |
| 📁 **`file-manager`** | Java 21 | Distributed file storage chunking & metadata indexer. |
| 🌤️ **`weather-service`** | Spring Boot | Microservice client & dynamic payload parser. |
| 🎲 **`dice`** | Java 21 | LLD Snake and Ladder / Board Game Engine. |
| 👔 **`employee-manager`** | Spring Data JPA | Multi-tenant employee data repository & REST API. |

---

## 📚 System Design Learning Hub (`.learn/.docs/`)

This repository includes an extensive library of 18 deep-dive architectural reference guides:

| # | Architectural Guide | Key Concepts Covered | Link |
| :- | :--- | :--- | :--- |
| **01** | **Distributed Caching & Decorator Pattern** | Hand-crafted LRU, Sentinel Nodes, Caffeine Adapter, Decorator Pattern | [`01_concurrency_and_lru_cache.md`](.learn/.docs/01_concurrency_and_lru_cache.md) |
| **02** | **High Concurrency & Flash Sales** | Redis Lua, Pessimistic (`FOR UPDATE`), `@Version`, Redisson Locks | [`02_high_concurrency_and_flash_sales.md`](.learn/.docs/02_high_concurrency_and_flash_sales.md) |
| **03** | **Multi-Threading & Async Architecture** | ThreadPoolExecutor, Virtual Threads (Loom), `CompletableFuture` | [`03_multithreading_and_async_architecture.md`](.learn/.docs/03_multithreading_and_async_architecture.md) |
| **04** | **API Rate Limiting & Throttling** | Token Bucket Algorithm, Spring `OncePerRequestFilter`, HTTP `429` | [`04_api_rate_limiting_and_throttling.md`](.learn/.docs/04_api_rate_limiting_and_throttling.md) |
| **05** | **DropBox & Cloud File Storage** | 4MB Chunking, SHA-256 Deduplication, Delta Sync Engine | [`05_dropbox_and_cloud_storage_design.md`](.learn/.docs/05_dropbox_and_cloud_storage_design.md) |
| **06** | **Real-Time Driver Tracking** | Geohash vs QuadTree vs Uber H3, Kafka Ingestion, Map Matching | [`06_delivery_tracking_system_design.md`](.learn/.docs/06_delivery_tracking_system_design.md) |
| **07** | **Resiliency & Fault Tolerance** | Resilience4j Circuit Breakers (`CLOSED`, `OPEN`, `HALF_OPEN`), Fallbacks | [`07_resiliency_and_circuit_breakers.md`](.learn/.docs/07_resiliency_and_circuit_breakers.md) |
| **08** | **Event-Driven Architecture & Pub-Sub** | Point-to-Point Message Queues (SQS) vs Pub-Sub Fan-Out (Kafka) | [`08_event_driven_architecture_and_sagas.md`](.learn/.docs/08_event_driven_architecture_and_sagas.md) |
| **09** | **Consistent Hashing & DHT** | Virtual Nodes, 128-bit Ring Partitioning, Minimized Re-sharding | [`09_consistent_hashing_and_dht.md`](.learn/.docs/09_consistent_hashing_and_dht.md) |
| **10** | **Database Sharding & Storage Engines** | InnoDB B+ Trees vs Cassandra LSM Trees (MemTable $\rightarrow$ SSTable) | [`10_database_sharding_and_storage_engines.md`](.learn/.docs/10_database_sharding_and_storage_engines.md) |
| **11** | **Load Balancing & Edge Caching** | L4 (TCP/UDP) vs L7 (HTTP) Load Balancing, NGINX, Envoy | [`11_load_balancing_proxies_and_cdn.md`](.learn/.docs/11_load_balancing_proxies_and_cdn.md) |
| **12** | **CAP Theorem & PACELC Theorem** | Strong vs Eventual Consistency, Latency vs Consistency Tradeoffs | [`12_cap_and_pacelc_theorems.md`](.learn/.docs/12_cap_and_pacelc_theorems.md) |
| **13** | **Bit Manipulation & Math Problems** | Bitwise Addition (`a ^ b`, `(a & b) << 1`), Digit Product Divisibility | [`13_dsa_bit_manipulation_and_math_problems.md`](.learn/.docs/13_dsa_bit_manipulation_and_math_problems.md) |
| **14** | **Audit Logging & S3 Glacier Archival** | Logback Async, Vector Sidecar, OpenObserve, S3 Glacier Lifecycle | [`14_audit_logging_openobserve_and_s3_glacier_archival.md`](.learn/.docs/14_audit_logging_openobserve_and_s3_glacier_archival.md) |
| **15** | **Payment Atomicity & Idempotency** | `Idempotency-Key` Header, Pre-Auth Hold & Capture, Transactional Outbox | [`15_payment_transaction_atomicity_and_idempotency.md`](.learn/.docs/15_payment_transaction_atomicity_and_idempotency.md) |
| **16** | **Real-World System Architectures** | Facebook Haystack/TAO, Amazon Dynamo, Twitter Snowflake/Fan-out, WhatsApp | [`16_real_world_system_architectures_case_studies.md`](.learn/.docs/16_real_world_system_architectures_case_studies.md) |
| **17** | **Back-of-the-Envelope Estimation** | Jeff Dean Latency Numbers, Powers of 2, SLA Availability Nines | [`17_back_of_the_envelope_estimation_and_latency_numbers.md`](.learn/.docs/17_back_of_the_envelope_estimation_and_latency_numbers.md) |
| **18** | **The 4-Step System Design Framework** | Scope Clarification, Blueprint, Architectural Deep Dive, Bottlenecks | [`18_system_design_interview_4_step_framework.md`](.learn/.docs/18_system_design_interview_4_step_framework.md) |

---

## ⚡ Getting Started & Parent Build

### Prerequisites:
- **Java 21** (Amazon Corretto / OpenJDK 21)
- **Maven 3.8+**

### Compile & Test All Modules:

```bash
# Clone repository
git clone https://github.com/qqrahul12/system-design-and-backend-craft.git
cd system-design-and-backend-craft

# Compile all 12 modules from parent POM
mvn clean test-compile

# Run complete test suite across all services
mvn test
```

---

## 👤 Author

**Rahul Jain**
- **GitHub**: [@qqrahul12](https://github.com/qqrahul12)
- **Specialization**: Backend Engineering, Distributed Systems, High Concurrency, Java 21 / Spring Boot
