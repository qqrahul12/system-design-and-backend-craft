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

### 3. Dual Branch Synchronization
- Both `master` and `main` branches must remain in exact synchronization.
- Always push to both branches together:
  `git push origin master && git push origin master:main`

### 4. Real-World Auth & State (RBAC)
- Signing out (`/logout`) must clear session to `Guest Visitor` (`isAuthenticated: false`), set wallet balance to `$0.00`, and hide enterprise/patron tabs.
- Anonymous guests can only access `/booking`, `/concessions`, `/chat`.
- Executive operations (`/admin`, `/agent`, `/tracing`, `/analytics`, `/documents`) are strictly reserved for `EXECUTIVE_ADMIN`.

### 5. Automated Quality Gates
All code changes must pass:
1. `cd ai-assistant-service && mvn test-compile` (0 errors)
2. `cd ai-assistant-ui && ./node_modules/.bin/tsc --noEmit` (0 errors)
3. `./node_bin/node test-suite.mjs` (56/56 tests passing, 100%)
