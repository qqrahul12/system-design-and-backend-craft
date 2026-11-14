---
name: code-review
description: >-
  Systematic pre-push code review and verification skill for CineMind. Enforces strict
  SOLID principles (Single Responsibility, Liskov Substitution, Interface Segregation,
  Dependency Inversion), feature-wise design pattern application, zero-secret git hygiene,
  synchronized master/main branch pushes, backend Java compilation, frontend TypeScript
  type-safety, and automated 56-test regression suite. Always run this skill before pushing code.
---

# CineMind Quality & Architecture Code Review Skill

This skill defines the mandatory pre-push architectural audit, feature-wise design pattern guidance, quality gates, and automated verification protocols established for the CineMind repository.

## Pre-Push Verification Checklist

Before staging or pushing code to remote branches, the agent must systematically execute the following 6 review gates:

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

### Gate 4: Real-World State & Auth Behavior (RBAC)

- When a session terminates (`/logout`), the session must reset to `Guest Visitor` (`isAuthenticated: false`, role: `ANONYMOUS`).
- Unauthenticated guests must have `$0.00` wallet balance and cannot perform top-ups or debits (return `401 Unauthorized`).
- Sidebar and Header navigation tabs must strictly enforce persona visibility:
  - Anonymous visitors only see `/booking`, `/concessions`, `/chat`.
  - Patrons see booking, concessions, chat, wallet, split, profile.
  - Enterprise Operations (`/admin`, `/agent`, `/tracing`, `/analytics`, `/documents`) are strictly reserved for `EXECUTIVE_ADMIN`.

---

### Gate 5: Automated Verification Pipeline

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
   *Requirement*: 100% pass rate (**56/56 tests passing**).

---

### Gate 6: Dual Branch Synchronization

- **Mandatory Constraint**: Both `master` and `main` branches must remain in exact synchronization.
- **Push Command**:
  ```bash
  git push origin master && git push origin master:main
  ```
- Verify with `git log -1` that both `origin/master` and `origin/main` point to the identical commit hash at `HEAD`.
