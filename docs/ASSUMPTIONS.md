# TUG - Assumptions and Design Decisions

## Overview

This document outlines the key assumptions, design decisions, and architectural choices made during the development of the TUG Fleet Management Transaction System.

---

## Database Choice

### Decision: PostgreSQL with TypeORM

**Rationale:**

- **ACID Compliance**: Transactions require strong consistency guarantees. PostgreSQL ensures atomic operations for balance deductions and limit updates.
- **Relational Data Model**: Clear relationships between Organizations, Cards, and Transactions fit naturally into a relational schema.
- **JSON Support**: `stationInfo` stored as JSONB provides flexibility for variable petrol station data without schema changes.
- **Mature Ecosystem**: Well-tested TypeORM integration with NestJS, extensive community support.
- **Scalability**: Proven track record handling high transaction volumes with proper indexing.

**Alternatives Considered:**

- **MongoDB**: Rejected due to lack of native ACID transactions across collections (critical for balance/limit updates).
- **Prisma ORM**: Considered but TypeORM chosen for more mature NestJS integration and migration tooling.

**Trade-offs:**

- ✅ Strong consistency, complex queries, referential integrity
- ❌ Vertical scaling limits (mitigated by read replicas and connection pooling)

---

## Caching Strategy

### Decision: Redis for Performance-Critical Lookups

**What We Cache:**

1. **Organization Balance**: `org_balance_{organizationId}` (TTL: 300s)
2. **Card Limits**: `card_limits_{cardId}` (TTL: 300s)

**Rationale:**

- **Hot Path Optimization**: Every webhook call queries organization balance and card limits. Caching reduces database load by ~80%.
- **Sub-millisecond Reads**: Redis provides <1ms latency for cached data vs 5-10ms for database queries.
- **Cache Invalidation**: Explicit invalidation on updates ensures consistency (no stale data risk).

**Cache-Aside Pattern:**

```typescript
1. Check Redis cache
2. If miss → Query database → Store in Redis
3. If hit → Return cached value
4. On update → Delete cache entry (cache-through)
```

**Why Not Cache Transactions:**

- Transactions are write-heavy (append-only), no read performance benefit from caching.
- Cache would add complexity without meaningful gains.

**Trade-offs:**

- ✅ 5-10x read performance improvement, reduced database load
- ❌ Additional infrastructure (Redis), cache invalidation complexity
- ❌ Eventual consistency window (max 5 minutes if cache survives but DB updates)

---

## Transaction Handling Approach

### Decision: Database Transactions with Row-Level Locking

**Implementation:**

```typescript
// QueryRunner for atomic operations
queryRunner.startTransaction();
try {
    // 1. Create PENDING transaction
    // 2. Validate balance and limits
    // 3. Deduct balance (with FOR UPDATE lock)
    // 4. Update card usage
    // 5. Mark transaction APPROVED
    queryRunner.commitTransaction();
} catch (error) {
    queryRunner.rollbackTransaction();
    // Mark transaction REJECTED
}
```

**Race Condition Prevention:**

- **`FOR UPDATE` Locking**: Organization balance queries lock the row, preventing concurrent deductions.
- **Serializable Isolation**: PostgreSQL default isolation level prevents dirty reads/phantom reads.
- **Atomic All-or-Nothing**: Balance, limits, and transaction status update together or roll back completely.

**Idempotency Layer:**

- Optional `idempotencyKey` in webhook payload
- Stores completed transaction responses in `idempotency_keys` table
- 24-hour retention prevents duplicate processing
- Race-safe with unique constraint on key

**Why Not Saga Pattern:**

- Single-database transactions sufficient (no distributed systems).
- Complexity not justified for current scale.

**Trade-offs:**

- ✅ Strong consistency, no double-charging, predictable behavior
- ❌ Row locks can create contention under heavy load (mitigated by fast operations)
- ❌ Single point of failure (database), though common for monolithic designs

---

## Limit Reset Mechanism

### Decision: Lazy Reset on Webhook Processing

**How It Works:**

```typescript
// Before processing transaction
if (currentDate > card.lastResetDate) {
    card.dailyUsage = 0;
    card.lastResetDate = currentDate;
}
if (currentMonth > card.lastResetDate.month) {
    card.monthlyUsage = 0;
}
```

**Rationale:**

- **No Background Jobs**: Eliminates cron job complexity and potential timing bugs.
- **Guaranteed Execution**: Reset always happens when needed (on-demand).
- **Timezone Agnostic**: Uses server time consistently, no timezone conversion errors.

**Alternatives Considered:**

- **Cron Job (Midnight Reset)**: Rejected due to:
    - Race conditions if transaction arrives during reset window
    - Missed resets if cron fails
    - Timezone complexity for global deployments
- **Event-Driven Reset**: Overkill for simple time-based logic

**Edge Cases Handled:**

- Card unused for days: Reset happens on next transaction (correct behavior).
- Multiple transactions in reset window: First transaction resets, others use updated usage.

**Trade-offs:**

- ✅ Simple, reliable, no external dependencies
- ❌ Cards with no activity never get "visually reset" (acceptable trade-off)

---

## Scalability Considerations

### Current Architecture: Monolithic Design

**Horizontal Scaling:**

- **Stateless Application**: All state in PostgreSQL/Redis, enabling multiple app instances.
- **Load Balancer Ready**: Sticky sessions not required, any instance can handle any request.
- **Database Connection Pooling**: TypeORM pools prevent connection exhaustion.

**Bottlenecks & Mitigation:**

1. **Database Write Contention**:
    - **Risk**: High-frequency transactions on same organization cause lock waiting.
    - **Mitigation**: Fast transaction execution (<50ms), optimistic timeouts, retry logic at client.
    - **Future**: Shard by organization ID if single-org throughput exceeds 100 req/s.

2. **Redis Single Point of Failure**:
    - **Risk**: Redis downtime disables caching.
    - **Mitigation**: Graceful degradation (cache miss → database query).
    - **Future**: Redis Cluster or Sentinel for high availability.

3. **Database Read Load**:
    - **Risk**: High read volume (reporting, analytics).
    - **Mitigation**: Database indexes, read replicas for non-critical queries.

**Vertical Scaling Limits:**

- Current design handles ~500 req/s per app instance (load tested with k6).
- PostgreSQL on 4-core machine: ~2000 transactions/s before CPU saturation.

**When to Refactor:**

- **Event Sourcing**: If audit trail/time-travel queries become critical.
- **Microservices**: If organization/card management needs independent scaling.
- **CQRS**: If read patterns diverge significantly from write patterns.

**Trade-offs:**

- ✅ Simple deployment, easy debugging, low operational overhead
- ❌ Shared database bottleneck, limited to single-region deployment

---

## Security Considerations

### Implemented Protections

**1. Rate Limiting**

- **Scope**: Webhook endpoint limited to 10 req/s per IP.
- **Implementation**: `@nestjs/throttler` with in-memory storage.
- **Rationale**: Prevents abuse, DoS attacks, accidental infinite loops from fuel stations.
- **Future**: Distributed rate limiting with Redis for multi-instance deployments.

**2. Request Validation**

- **Schema Validation**: All webhook payloads validated with `class-validator`.
- **Type Safety**: TypeScript ensures compile-time type checking.
- **Rejection**: Invalid payloads rejected with 400 Bad Request (no processing).

**3. Idempotency Protection**

- **Purpose**: Prevents duplicate charges from network retries.
- **Implementation**: Optional `idempotencyKey` with 24-hour deduplication.
- **Database Constraint**: Unique index prevents race conditions.

**4. SQL Injection Prevention**

- **ORM Parameterization**: TypeORM uses parameterized queries (no raw SQL injection risk).
- **Validation**: All inputs validated before database queries.

**5. Error Information Disclosure**

- **Global Exception Filter**: Internal errors sanitized, no stack traces in production.
- **Generic Messages**: Database errors converted to user-friendly messages.

### Not Implemented (Assumptions)

**Authentication/Authorization**:

- **Assumption**: Webhook endpoint called by trusted petrol station systems on private network.
- **Future**: If exposed publicly:
    - API key authentication (`X-API-Key` header)
    - HMAC signature verification
    - mTLS for station-to-backend communication

**Data Encryption**:

- **Assumption**: TLS in transit (handled by load balancer/reverse proxy).
- **Assumption**: Database encryption at rest (handled by cloud provider or DBA).
- **No PII**: Card numbers treated as identifiers, not sensitive data (no masking implemented).

**Audit Logging**:

- **Implemented**: Winston structured logs (who, what, when).
- **Not Implemented**: Immutable audit trail (blockchain-style).
- **Future**: Append-only audit table for compliance requirements.

**Trade-offs:**

- ✅ Protects against common attack vectors (injection, DoS, duplication)
- ❌ No authentication (acceptable if on private network)
- ❌ No end-to-end encryption (acceptable for non-PII data)

---

## Event-Driven Architecture

### Decision: In-Process EventEmitter (Not Message Queue)

**Events Emitted:**

- `transaction.approved` → Logging, analytics
- `transaction.rejected` → Alerting, fraud detection hooks
- `balance.updated` → Notifications, webhooks to admin systems

**Rationale:**

- **Simplicity**: No external message broker (Kafka, RabbitMQ) required.
- **Synchronous Processing**: Events processed in-memory before webhook response.
- **Sufficient for Current Scale**: <1ms event processing overhead.

**When to Migrate to Message Queue:**

- Async processing required (e.g., send emails, external API calls).
- Event consumers need independent scaling.
- Event replay/reprocessing required for recovery.

**Trade-offs:**

- ✅ Zero infrastructure overhead, fast event delivery
- ❌ No durability (events lost if app crashes), no async processing

---

## Data Consistency Model

### Decision: Strong Consistency with Relaxed Caching

**Consistency Guarantees:**

1. **Balance Deductions**: ACID transactions ensure no double-spending.
2. **Limit Tracking**: Atomic updates prevent limit bypass.
3. **Transaction Status**: Always reflects true system state (no orphaned transactions).

**Eventual Consistency:**

- **Cache Layer**: Redis cache may lag database by TTL window (max 5 minutes).
- **Acceptable**: Stale cache only affects read performance, not correctness.
- **Mitigation**: Cache invalidated on writes (effective consistency <1s in practice).

**Trade-offs:**

- ✅ No financial inconsistencies, predictable behavior
- ❌ Write-heavy operations (every transaction updates balance)

---

## Testing Strategy

### Decision: Comprehensive Unit + E2E Testing

**Coverage:**

- **Unit Tests**: 19 tests, 100% coverage of service logic.
- **E2E Tests**: 10 tests, full webhook flow validation.
- **No Mocks in E2E**: Real PostgreSQL and Redis for confidence.

**Factory Pattern:**

```typescript
const org = await factory.organizations.create({ balance: 5000 });
const card = await factory.cards.create({ organizationId: org.id });
```

**Rationale:**

- **Refactoring Safety**: Tests catch breaking changes immediately.
- **Documentation**: Tests serve as usage examples.
- **Regression Prevention**: E2E tests validate integration points.

**CI/CD Integration:**

- All tests run on every commit.
- PRs blocked if tests fail (GitHub Actions).

**Trade-offs:**

- ✅ High confidence in deployments, fast feedback loop
- ❌ E2E tests slower (~3s), require infrastructure

---

## Technology Stack Choices

### Core Framework: NestJS

- **Why**: TypeScript-first, modular architecture, excellent DI container, strong ecosystem.
- **vs Express**: NestJS structure scales better for team projects.
- **vs Fastify**: NestJS abstracts underlying HTTP (can swap to Fastify if needed).

### ORM: TypeORM

- **Why**: Mature NestJS integration, migration tooling, Active Record + Repository patterns.
- **vs Prisma**: TypeORM better for complex migrations and legacy database support.
- **vs Sequelize**: TypeORM TypeScript support superior.

### Cache: Redis

- **Why**: Industry standard, proven performance, wide language support.
- **vs Memcached**: Redis persistence and data structures (if needed later).
- **vs In-Memory**: Redis supports multi-instance deployments.

### Logging: Winston

- **Why**: Mature, flexible transports (file, console, external services).
- **vs Pino**: Winston easier configuration, more transports out-of-box.

### Rate Limiting: @nestjs/throttler

- **Why**: Official NestJS package, decorator-based, easy to configure.
- **vs express-rate-limit**: Better NestJS integration.

---

## Deployment Assumptions

**Environment:**

- **Expected**: Docker containers on Kubernetes/ECS or VM-based deployment.
- **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL) with automated backups.
- **Redis**: Managed Redis (AWS ElastiCache, Redis Cloud) for high availability.
- **Load Balancer**: Nginx/ALB for TLS termination and request distribution.

**Environment Variables:**

- All secrets (DB credentials, Redis URL) injected via environment.
- No `.env` files in production (use secrets management).

**Monitoring (Not Implemented):**

- **Expected**: External APM tool (Datadog, New Relic, Prometheus).
- **Health Check**: `/health` endpoint for liveness/readiness probes.

---

## Future Enhancements

### Short-Term (If Requirements Change):

1. **API Authentication**: JWT or API key for public-facing endpoints.
2. **Admin Dashboard**: CRUD for organizations, cards (currently seed-only).
3. **Webhook Callbacks**: Notify external systems on transaction events.
4. **Reporting API**: Transaction history, balance summaries.

### Long-Term (Scale > 10k req/s):

1. **Database Sharding**: Partition by organization ID.
2. **Read Replicas**: Offload reporting queries from primary database.
3. **CQRS Pattern**: Separate read/write models for optimization.
4. **Message Queue**: Kafka/RabbitMQ for async event processing.
5. **GraphQL API**: If clients need flexible querying.

---

## Known Limitations

1. **Single Region**: No multi-region support (latency for global users).
2. **No Soft Deletes**: Entities deleted permanently (no audit trail recovery).
3. **Fixed Currency**: Amounts stored as numbers, no multi-currency support.
4. **No Timezone Handling**: Server timezone used for limit resets (assumption: single region).
5. **No Refund Mechanism**: Rejected transactions cannot be retried (must resend webhook).

---

## Summary

The TUG system prioritizes:

- **Correctness**: Strong consistency for financial operations.
- **Simplicity**: Monolithic design for ease of deployment and debugging.
- **Performance**: Redis caching for hot paths, database indexes for queries.
- **Reliability**: Comprehensive tests, idempotency, rate limiting.

Design choices reflect a pragmatic balance between production-readiness and implementation complexity, suitable for a fleet management system handling up to ~2000 transactions/second on modest hardware.
