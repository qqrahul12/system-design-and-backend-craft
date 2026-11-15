# CineMind Project Rules & Code Quality Standards

## Mandatory Pre-Push Review Rule
Before executing any git commit or push to remote repositories, you MUST run the `code-review` skill and execute `./.agents/skills/code-review/scripts/verify-all.sh`.

---

## Core Engineering Directives

### 1. SOLID Principles
- **S (Single Responsibility)**:
  - Controllers only handle HTTP request mapping and status codes; zero business calculations.
  - Cryptographic operations (e.g. `TicketSignatureService`) must be segregated from persistence and domain services.
  - React UI pages in `ai-assistant-ui/src/app` must never use raw inline `fetch(...)`. They must import typed domain services from `ai-assistant-ui/src/services/` (`apiClient`, `authService`, `ticketService`, `walletService`, `splitService`, `concessionsService`, `movieService`).
- **O (Open/Closed) & L (Liskov Substitution)**:
  - Use `supports()` predicates and `@Order` priority chains.
  - **Zero `instanceof` downcasting** in strategy engines (`PricingEngine`) or adapter resolvers (`PaymentAdapterRegistry`).
- **I (Interface Segregation)**:
  - Use clean, lean interfaces: `TicketService`, `WalletService`, `MovieCatalogService`, `ConcessionsService`, `SplitMoneyService`.
- **D (Dependency Inversion)**:
  - High-level classes and controllers must depend exclusively on interface abstractions, not concrete classes.

### 2. Design Patterns Applied by Feature
- **Strategy Pattern**: Theatrical pricing calculation (`PricingStrategy`, `PricingEngine`, `StandardCatalogPricingStrategy`, `ImaxLargeFormatStrategy`). Enforce `supports(format)` and `@Order`.
- **Adapter Pattern**: Polymorphic billing unification (`PaymentGatewayAdapter`, `ResilientCardPaymentAdapter`, `FintechWalletPaymentAdapter`, `PaymentAdapterRegistry`).
- **Circuit Breaker Pattern**: Resilience4j wrapping of remote payment and AI LLM endpoints.
- **Template Method Pattern**: Multi-step transactional checkout pipelines (`OrderProcessor`, `ConcessionOrderProcessor`, `TicketOrderProcessor`).
- **Chain of Responsibility Pattern**: Defensive prompt injection firewall and LLMOps filtering (`PromptSecurityFilter`, `RegexAdversarialFilter`, `LlmSemanticInjectionFilter`, `SecurityFilterChain`).
- **Mediator Pattern**: Decoupled multi-agent swarm coordination (`MultiAgentOrchestratorService`, `CinemaAgent`, `AgentWebSocketHandler`).
- **Observer / Reactive Pub-Sub Pattern**: Live seat locks and kitchen order streaming via Spring WebFlux `Flux`, SSE `EventSource`, and WebSockets.
- **Service & Signature Strategy**: Decoupled HMAC cryptographic verification (`TicketSignatureService`, `HmacTicketSignatureService`).
- **Memento / Double-Entry Ledger**: Immutable audit trail for digital wallet transactions (`WalletTransaction`).
- **Service Gateway / Facade**: Frontend network isolation layer (`ai-assistant-ui/src/services/`).

### 3. Zero Secrets in Git
- Never stage or commit passwords, tokens, API keys, or connection URIs.
- All secrets reside strictly in `.env` (ignored by `.gitignore`).

### 4. Dual Branch Synchronization
- Both `master` and `main` branches must remain in exact synchronization.
- Always push to both branches together:
  `git push origin master && git push origin master:main`

### 5. Real-World Auth & Full-Stack RBAC
- **Frontend Navigation & Page Gating**:
  - Signing out (`/logout`) must clear session to `Guest Visitor` (`isAuthenticated: false`), set wallet balance to `$0.00`, and hide enterprise/patron tabs.
  - Anonymous visitors can only access `/booking`, `/concessions`, `/chat`.
  - Executive operations (`/admin`, `/agent`, `/tracing`, `/analytics`, `/documents`) are strictly reserved for `EXECUTIVE_ADMIN`. `admin/page.tsx` renders access-denied shield for unauthorized roles.
- **Backend Controller Operation Enforcement**:
  - Controllers must actively enforce authorization via `AuthService` (`requireRole`, `requirePermission`, `requireAuthenticated`).
  - `AdminController` (`/api/v1/admin/**`): Strictly guarded with `requireRole(EXECUTIVE_ADMIN)`.
  - `RagController` (`/api/v1/rag/ingest`): Guarded with `requirePermission("RAG_INGESTION")`.
  - `TelemetryController` (`/api/v1/telemetry/**`): Guarded with `requirePermission("APM_TRACES")`.
  - `LlmOpsController` (`/api/v1/llmops/**`): Guarded with `requirePermission("LLMOPS_TELEMETRY")`.
  - `AgentController` (`/api/v1/agents/orchestrate`): Guarded with `requirePermission("AGENT_ORCHESTRATE")`.
  - `TicketController` (`/api/v1/tickets/validate`): Guarded with `requirePermission("SCAN_GATE_PASS")`.
  - `WalletController` (`/topup`, `/pay`): Guarded with `requireAuthenticated()`.

### 6. Concurrency, Dual-Write & Transactional Integrity
- **Single Source of Truth (SSOT)**:
  - When persistent storage (PostgreSQL, Redis) is enabled, it is the sole authoritative Single Source of Truth.
  - Queries (`getAll*`, `getById*`) must query the database directly.
- **Zero Dual-Write Anti-Pattern**:
  - Never dual-write to both a database (`JdbcTemplate` / JPA) and an ad-hoc local heap collection (`ConcurrentHashMap`, `ArrayList`).
  - Dual-writing causes atomicity failures, thread race conditions (diverging DB vs memory states under concurrent writes), and distributed cache incoherence across multi-instance cloud containers.
- **Spring `@Transactional` Enforcement**:
  - All mutating business operations (`create*`, `update*`, `delete*`, and bulk ingestion pipelines) must be explicitly demarcated with `@Transactional`.
- **Distributed Caching Standard**:
  - If caching is required for performance, use Redis with explicit TTLs and cache invalidation policies (`@Cacheable`, `@CacheEvict`), never uncoordinated local JVM memory.

### 7. Zero Hardcoded Data Policy & Externalized SSOT Ingestion
- **Zero Mock / Seed Arrays in Code**:
  - Never embed hardcoded seed fixtures, mock collections, dummy data arrays, or hardcoded persona names in Java service classes, controllers, or React UI pages (`List.of(...)`, `seedInitial...`, hardcoded persona strings like "Switch to Elena Rostova").
  - Business recommendations (such as combos or bundle discounts) must be computed dynamically against database records, never by hardcoding specific IDs.
- **Zero Hardcoded Values in SQL Queries**:
  - All SQL queries (`JdbcTemplate`, JPA) must be parameterized (`?` or `:namedParam`). Never hardcode literal identifiers or domain values inside query strings (`WHERE id = '...'`).
- **Zero Inline DDL in Application Java Code**:
  - Never execute DDL statements (`CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `CREATE INDEX`) via inline `jdbcTemplate.execute(...)` inside Java service methods or constructors.
  - All database schemas and initial migration seeds must reside strictly in dedicated database initialization scripts (`schema.sql`) or Flyway migration scripts.
- **API-Driven Ingestion & DB Migrations**:
  - All catalog items, menus, user personas, and initial entities must be ingested dynamically through documented REST API endpoints (`POST /seed`, `POST /items/batch`, `POST /api/v1/auth/users/batch`) or database migration scripts (`schema.sql`).
  - PostgreSQL is the sole Single Source of Truth. If records are missing, return 404/empty rather than falling back to in-memory fixtures.

### 8. Automated Quality Gates
All code changes must pass:
1. `cd ai-assistant-service && mvn test-compile` (0 errors)
2. `cd ai-assistant-ui && ./node_modules/.bin/tsc --noEmit` (0 errors)
3. `./node_bin/node test-suite.mjs` (59/59 tests passing, 100%)
