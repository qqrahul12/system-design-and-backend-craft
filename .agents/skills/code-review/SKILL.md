---
name: code-review
description: >-
  Systematic pre-push code review and verification skill for CineMind. Enforces strict
  SOLID principles (Single Responsibility, Liskov Substitution, Interface Segregation,
  Dependency Inversion), feature-wise design pattern application, zero-secret git hygiene,
  full-stack RBAC route and operation security, concurrency and transactional integrity
  (zero dual-write hazards, Single Source of Truth architecture), synchronized master/main
  branch pushes, backend Java compilation, frontend TypeScript type-safety, and automated 57-test regression suite.
  Always run this skill before pushing code.
---

# CineMind Quality & Architecture Code Review Skill

This skill defines the mandatory pre-push architectural audit, feature-wise design pattern guidance, quality gates, and automated verification protocols established for the CineMind repository.

## Pre-Push Verification Checklist

Before staging or pushing code to remote branches, the agent must systematically execute the following 7 review gates:

---

### Gate 1: SOLID Principles & Architectural Standards

#### 1. Single Responsibility Principle (SRP)
- **Controllers & Adapters**: Controllers (`MovieController`, `TicketController`, `WalletController`, etc.) and Tool Registries (`McpToolRegistry`) must never execute business calculations or ledger mutations directly; they must delegate entirely to domain services.
- **Cryptographic & Security Isolation**: Cryptographic hashing and token verification must reside in isolated services (e.g., `TicketSignatureService` / `HmacTicketSignatureService`), never embedded within data repositories or persistence entities.
- **Frontend UI Decoupling**: React UI pages in `ai-assistant-ui/src/app` must **never** make direct raw inline `fetch(...)` calls with URL strings or manual JSON bodies. All network calls, headers, and error handling must be encapsulated inside typed domain services in `ai-assistant-ui/src/services/` (`apiClient`, `authService`, `movieService`, `walletService`, `ticketService`, `splitService`, `concessionsService`).

#### 2. Open/Closed Principle (OCP)
- Systems must be extensible via Strategy, Adapter, or Chain of Responsibility patterns rather than modifying existing classes or sprawling `switch`/`if-else` cascades.
- Extensibility points must expose `boolean supports(...)` predicates and `@Order` priority chains.

#### 3. Liskov Substitution Principle (LSP)
- **Strict Prohibition of `instanceof` Downcasting**: Strategy resolvers (`PricingEngine`) and Adapter registries (`PaymentAdapterRegistry`) must **never** check `instanceof ConcreteType`.
- Subtypes must be 100% substitutable via their base interface contracts without altering program correctness.

#### 4. Interface Segregation Principle (ISP)
- Monolithic services must be segregated into lean, cohesive interfaces defining only the contract methods callers need:
  - `TicketService`
  - `WalletService`
  - `MovieCatalogService`
  - `ConcessionsService`
  - `SplitMoneyService`

#### 5. Dependency Inversion Principle (DIP)
- High-level business orchestrators, services, and REST controllers must depend exclusively on interface abstractions, not concrete implementation classes.
- For example, `ResilientCardPaymentAdapter` injects `PaymentGatewayClient`, and `SplitMoneyServiceImpl` injects `PaymentAdapterRegistry` and `WalletService`.

---

### Gate 2: Feature-Wise Design Patterns Catalog

Use the appropriate design pattern according to feature requirements:

| CineMind Feature Domain | Recommended Design Pattern | Implementation Classes & Contracts | When & How to Apply |
| :--- | :--- | :--- | :--- |
| **Theatrical Ticket Pricing & Dynamic Surcharges** | **Strategy Pattern** | `PricingStrategy`, `PricingEngine`, `StandardCatalogPricingStrategy`, `ImaxLargeFormatStrategy` | Use when calculating prices across heterogeneous screen formats (IMAX 70mm, Dolby, 3D) without modifying the checkout engine. New formats implement `PricingStrategy` with `supports(format)` and `@Order`. |
| **Heterogeneous Payment Gateways** | **Adapter Pattern** | `PaymentGatewayAdapter`, `ResilientCardPaymentAdapter`, `FintechWalletPaymentAdapter`, `PaymentAdapterRegistry` | Use when unifying disparate billing systems (CineCash stored-value wallet, Stripe credit card, Apple Pay) under a common polymorphic interface. |
| **Third-Party Gateway Resilience & Fallbacks** | **Circuit Breaker Pattern** | `Resilience4j`, `PaymentGatewayClient`, `StripePaymentGatewayClient` | Use when calling external or remote payment APIs. Outages or rate-limits must trip the circuit breaker and return a fallback result without throwing unhandled exceptions. |
| **Concessions & Order Processing Workflows** | **Template Method Pattern** | `OrderProcessor`, `ConcessionOrderProcessor`, `TicketOrderProcessor` | Use in multi-step purchase workflows where the invariant algorithmic skeleton (Validate -> Reserve -> Charge -> Record -> Notify) is enforced while step implementations vary. |
| **Prompt Injection Firewall & LLMOps Security** | **Chain of Responsibility Pattern** | `PromptSecurityFilter`, `RegexAdversarialFilter`, `LlmSemanticInjectionFilter`, `SecurityFilterChain` | Use when defending LLM chat endpoints against prompt injection, jailbreaks, and adversarial attacks. Filters inspect and pass down the chain sequentially. |
| **Multi-Agent Swarm Orchestration** | **Mediator / Orchestrator Pattern** | `MultiAgentOrchestratorService`, `CinemaAgent`, `AgentWebSocketHandler` | Use to coordinate autonomous specialist agents (Director, Chef, Usher, Concierge) via a central message mediator rather than brittle point-to-point agent references. |
| **Real-Time Seat Locks & Kitchen Status Streams** | **Observer / Reactive Pub-Sub Pattern** | `Sinks.Many`, Spring WebFlux `Flux`, SSE `EventSource`, WebSocket | Use for broadcasting live state changes (seats locked, kitchen order status advanced, gate admission validated) asynchronously to connected frontend clients. |
| **Digital Ticket Anti-Tamper Verification** | **Signature Strategy Pattern** | `TicketSignatureService`, `HmacTicketSignatureService` | Use to decouple cryptographic hash/token generation and timing-safe verification (`MessageDigest.isEqual`) from ticket persistence and domain entities. |
| **Fintech Stored-Value Ledger** | **Memento / Double-Entry Ledger Pattern** | `WalletTransaction`, `AtomicReference` | Use for thread-safe balance mutations with immutable transaction records, ensuring complete financial auditability and atomic debits. |
| **Frontend Network & State Decoupling** | **Service Gateway / Facade Pattern** | `ai-assistant-ui/src/services/` (`apiClient`, `splitService`, `ticketService`, etc.) | Use to isolate React UI rendering components from raw HTTP requests, status codes, serialization, and auth header management. |

---

### Gate 3: Security & Git Hygiene (Zero Credentials in Git)

- **Scan Git Diff**: Run `git diff --staged` or inspect modified files before committing.
- **Strict Prohibition**: Never stage or commit passwords, secret keys, API keys, database credentials, or Redis connection strings.
- **Environment Isolation**: All cloud credentials (`POSTGRES_*`, `REDIS_*`, `GROQ_API_KEY`, `GEMINI_API_KEY`) must reside exclusively in `.env`, which is ignored by `.gitignore`.

---

### Gate 4: Real-World State & Auth Behavior (Full-Stack RBAC)

CineMind enforces two-tier Role-Based Access Control (RBAC) at both the **frontend UI route/tab level** and the **backend REST controller operation level**:

#### 1. Frontend Route & Navigation Tab Gating
- When a session terminates (`/logout`), the session must reset to `Guest Visitor` (`isAuthenticated: false`, role: `ANONYMOUS`, wallet `$0.00`).
- Sidebar and Header navigation tabs must strictly enforce persona visibility via `allowedRoles`:
  - **Anonymous Visitors** (`isAuthenticated: false`): Only allowed `/booking`, `/concessions`, `/chat`. All patron and enterprise tabs are hidden.
  - **Patrons** (`VIP_PATRON`, `STANDARD_GUEST`): Access consumer tabs (`/booking`, `/concessions`, `/chat`, `/wallet`, `/split`, `/profile`).
  - **Executive Operations** (`/admin`, `/agent`, `/tracing`, `/analytics`, `/documents`): Strictly reserved for `EXECUTIVE_ADMIN`.
- Protected pages (e.g. `admin/page.tsx`) must actively check `currentUser.role === 'EXECUTIVE_ADMIN'` and render an access-denied shield banner if a non-admin attempts direct URL access.

#### 2. Backend Controller Operation-Level Enforcement
Controllers must **never** rely solely on frontend tab hiding. Every protected endpoint must actively enforce authorization via `AuthService`:
- **`AdminController`** (`/api/v1/admin/**`): Must call `authService.requireRole(EXECUTIVE_ADMIN)` on all endpoints (analytics, briefings, circuit breaker simulation). Returns `403 Forbidden` for non-admins, `401 Unauthorized` for anonymous.
- **`RagController`** (`/api/v1/rag/ingest`): Must call `authService.requirePermission("RAG_INGESTION")` to prevent unauthorized vector store poisoning.
- **`TelemetryController`** (`/api/v1/telemetry/**`): Must call `authService.requirePermission("APM_TRACES")` to prevent leaking APM spans and trace latency metrics.
- **`LlmOpsController`** (`/api/v1/llmops/**`): Must call `authService.requirePermission("LLMOPS_TELEMETRY")` for metrics and cache clearing.
- **`AgentController`** (`/api/v1/agents/orchestrate`): Must call `authService.requirePermission("AGENT_ORCHESTRATE")` to prevent unauthenticated multi-agent swarm resource consumption.
- **`TicketController`** (`/api/v1/tickets/validate`): Must call `authService.requirePermission("SCAN_GATE_PASS")` (`AUDITORIUM_USHER` or `EXECUTIVE_ADMIN`).
- **`WalletController`** (`/api/v1/wallet/topup`, `/pay`): Must call `authService.requireAuthenticated()`, rejecting unauthenticated guests with `401 Unauthorized`.

#### 3. Client Header & Session Propagation
- `apiClient.ts` must propagate authenticated identity headers (`X-Role` or `Authorization: Bearer <token>`) synchronized from `authService`.
- Backend `AuthService.getCurrentUser()` must inspect request headers via `RequestContextHolder` to support both stateless API clients and stateful UI sessions.

---

### Gate 5: Concurrency, Dual-Write & Transactional Integrity

Multi-tier distributed backends must safeguard state consistency across concurrent threads, distributed transactions, and multiple container instances:

#### 1. Prohibition of Dual-Writes
- **Anti-Pattern**: Writing concurrently to a relational database (`JdbcTemplate` / JPA) AND an in-memory JVM heap collection (`ConcurrentHashMap`, `ArrayList`) in the same mutating method (e.g. `saveToDatabase(entity); memoryMap.put(id, entity);`).
- **Hazard Analysis**:
  - *Atomicity Failure*: If the database write succeeds but the memory update or JVM fails (or vice versa), the storage layers permanently diverge.
  - *Race Condition*: Under concurrent requests, two threads updating the same record can interleave their database and memory writes out of order, leaving stale data in memory.
  - *Distributed Desynchronization*: In cloud/clustered deployments (Render, Kubernetes), local heap updates only affect the single container that served the request; all other peer containers serve stale data.
- **Rule**: When a persistent store (PostgreSQL) is active, it must be the **Single Source of Truth (SSOT)**. Domain services must query and persist directly to the database. Local heap structures may only serve as non-production fallback when no database connection is present.

#### 2. Declarative Transaction Boundaries (`@Transactional`)
- All mutating service operations (`create*`, `update*`, `delete*`, and batch ingestion pipelines) must be explicitly annotated with Spring's `@Transactional`.
- Rollback semantics ensure that if any statement in a checkout, wallet debit, or catalog update fails, no partial or corrupt state is committed.

#### 3. Distributed vs In-Process Caching
- High-throughput caching must utilize centralized distributed caches (Redis via Spring `@Cacheable`, `@CacheEvict` with explicit TTLs), never uncoordinated local JVM maps.
- Redis-backed distributed locks (`StringRedisTemplate` with expiration TTLs) must be used for cross-instance resource locking (e.g. seat locking during checkout).

---

### Gate 6: Automated Verification Pipeline

Execute the automated verification script:
```bash
./.agents/skills/code-review/scripts/verify-all.sh
```

Or run the three steps individually:

1. **Backend Compilation**:
   ```bash
   cd ai-assistant-service && mvn test-compile
   ```
   *Requirement*: 0 compilation errors across all source files.

2. **Frontend Type Check**:
   ```bash
   export PATH="$(pwd)/node_bin:$PATH" && cd ai-assistant-ui && ./node_modules/.bin/tsc --noEmit
   ```
   *Requirement*: 0 TypeScript diagnostics/errors.

3. **End-to-End Test Suite**:
   ```bash
   ./node_bin/node test-suite.mjs
   ```
   *Requirement*: 100% pass rate (**57/57 tests passing**, including automated RBAC Security Gate checks).

---

### Gate 7: Dual Branch Synchronization

- **Mandatory Constraint**: Both `master` and `main` branches must remain in exact synchronization.
- **Push Command**:
  ```bash
  git push origin master && git push origin master:main
  ```
- Verify with `git log -1` that both `origin/master` and `origin/main` point to the identical commit hash at `HEAD`.
