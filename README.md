# TUG - Fleet Management Transaction System

A production-ready NestJS backend application for managing fuel purchase transactions for fleet cards with real-time validation, caching, and comprehensive testing.

---

## ✨ Features

### Core Functionality

- **Transaction Webhook Processing**: Real-time fuel purchase validation and approval
- **Multi-Level Validation**:
    - Organization balance verification
    - Card daily spending limits
    - Card monthly spending limits
    - Automatic daily/monthly limit resets
- **Atomic Transactions**: Database transactions ensure data consistency
- **Concurrent Transaction Handling**: Race condition protection with database locking

### Advanced Features

- **Redis Caching**: High-performance caching for organization and card lookups
- **Event-Driven Architecture**: Transaction events for logging and notifications
- **Comprehensive Error Handling**: Custom exceptions with meaningful error messages
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Validation**: Request payload validation with class-validator
- **Type Safety**: Full TypeScript implementation

### Production Features

- **Structured Logging**: Winston logger with file output and error tracking
- **Rate Limiting**: Webhook endpoint protection (10 req/sec per IP)
- **Idempotency Protection**: Duplicate transaction prevention with 24-hour key retention
- **Health Checks**: Database connectivity monitoring at `/health`
- **Database Indexes**: Optimized queries on card numbers, timestamps, and foreign keys

### Quality Assurance

- **29 Automated Tests**: 19 unit tests + 10 E2E tests
- **100% Service Coverage**: Critical business logic fully tested
- **Refactored Test Infrastructure**: Factory pattern and helpers for maintainability
- **CI/CD Pipeline**: Automated testing, linting, and build verification

---

## 🏗 Architecture

### High-Level Overview

```
┌─────────────┐
│   Webhook   │──┐
│  (Fuel POS) │  │
└─────────────┘  │
                 │
                 ▼
         ┌──────────────┐
         │   NestJS     │
         │ Application  │
         └──────────────┘
                │
        ┌───────┼───────┐
        │       │       │
        ▼       ▼       ▼
    ┌─────┐ ┌────┐ ┌─────┐
    │ DB  │ │Redis│ │Event│
    │(PG) │ │Cache│ │ Bus │
    └─────┘ └────┘ └─────┘
```

### Transaction Flow

1. **Webhook Received** → POST `/transactions/webhook`
2. **Request Validation** → class-validator checks payload
3. **Card Lookup** → Check card exists (with Redis cache)
4. **Limit Reset Check** → Auto-reset daily/monthly limits if needed
5. **Balance Validation** → Verify organization has sufficient funds
6. **Limit Validation** → Check daily and monthly limits
7. **Database Transaction** → Atomic update (balance + limits + transaction record)
8. **Cache Invalidation** → Clear affected Redis cache entries
9. **Event Emission** → Emit success/failure events
10. **Response** → Return approval or rejection with reason

### Modules

- **Transactions Module**: Core webhook processing and validation
- **Organizations Module**: Balance management and lookups
- **Cards Module**: Card validation, limit checking, and auto-reset
- **Common Module**: Shared filters, exceptions, events, and utilities
- **Config Module**: Environment configuration and service setup

---

## 🛠 Technology Stack

| Category          | Technologies                       |
| ----------------- | ---------------------------------- |
| **Framework**     | NestJS 11, TypeScript 5.1          |
| **Database**      | PostgreSQL 15, TypeORM 0.3.28      |
| **Caching**       | Redis 7, cache-manager             |
| **Validation**    | class-validator, class-transformer |
| **API Docs**      | Swagger/OpenAPI (@nestjs/swagger)  |
| **Events**        | EventEmitter2                      |
| **Logging**       | Winston 3, nest-winston            |
| **Rate Limiting** | @nestjs/throttler                  |
| **Health Checks** | @nestjs/terminus                   |
| **Testing**       | Jest 29 (unit + E2E), Supertest    |
| **DevOps**        | Docker Compose V2, GitHub Actions  |
| **Code Quality**  | ESLint, Prettier (4-space indent)  |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Docker & Docker Compose**: For containerized setup (recommended)
- **PostgreSQL**: v15 (if running locally without Docker)
- **Redis**: v7 (if running locally without Docker)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd tug

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure your .env file (see Environment Variables section)
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=tug_user
DB_PASSWORD=tug_password
DB_NAME=tug_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional: Redis Password
# REDIS_PASSWORD=your_redis_password
```

**Environment-Specific Configurations:**

- **Development**: `NODE_ENV=development` (auto-sync TypeORM entities)
- **Production**: `NODE_ENV=production` (manual migrations required)
- **Testing**: `NODE_ENV=test` (used by E2E tests)

---

## 🏃 Running the Application

### Local Development

**1. Start PostgreSQL and Redis:**

```bash
# Using Docker Compose V2 (services only)
docker compose up -d postgres redis
```

**2. Run database migrations and seed:**

```bash
# TypeORM will auto-sync in development mode
# Or manually seed test data
npm run seed
```

**3. Start the application:**

```bash
# Development mode with hot-reload
npm run start:dev

# Regular start
npm run start

# Production mode
npm run build
npm run start:prod
```

**4. Access the application:**

- **API Base URL**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

### Docker

**Run everything with Docker Compose:**

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f app

# Stop all services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

**Docker Compose Services:**

- **app**: NestJS application (port 3000)
- **postgres**: PostgreSQL database (port 5432)
- **redis**: Redis cache (port 6379)

**Seed the database in Docker:**

```bash
docker compose exec app npm run seed
```

---

## 📚 API Documentation

### Interactive Documentation

Access the **Swagger UI** at: http://localhost:3000/api

### Webhook Endpoint

**POST** `/transactions/webhook`

Process a fuel purchase transaction webhook.

**Request Body:**

```json
{
    "cardNumber": "1234-5678-9012-3456",
    "amount": 150.5,
    "timestamp": "2026-02-01T10:30:00Z",
    "idempotencyKey": "station_123_txn_abc_2026-02-01T10:30:00Z",
    "stationInfo": {
        "name": "Shell Station Downtown",
        "location": "123 Main St, City"
    }
}
```

**Field Validations:**

- `cardNumber`: Required, string
- `amount`: Required, number, minimum 0.01
- `timestamp`: Required, ISO 8601 date string
- `idempotencyKey`: Optional, string - prevents duplicate processing (24-hour retention)
- `stationInfo`: Optional, object with name/location

**Success Response (200 OK):**

```json
{
    "id": "uuid-here",
    "status": "APPROVED",
    "amount": 150.5,
    "timestamp": "2026-02-01T10:30:00Z",
    "message": "Transaction approved successfully"
}
```

**Rejection Response (403 Forbidden - Daily Limit):**

```json
{
    "statusCode": 403,
    "timestamp": "2026-02-01T10:30:05.123Z",
    "path": "/transactions/webhook",
    "error": "Daily Limit Exceeded",
    "message": "Daily limit exceeded. Available: $100.00, Requested: $150.50"
}
```

**Other Rejection Scenarios:**

| Status Code | Error                  | Description                           |
| ----------- | ---------------------- | ------------------------------------- |
| 402         | Insufficient Balance   | Organization has insufficient funds   |
| 403         | Monthly Limit Exceeded | Card monthly limit would be exceeded  |
| 404         | Card Not Found         | Card number doesn't exist             |
| 404         | Organization Not Found | Associated organization doesn't exist |
| 400         | Bad Request            | Validation errors in request payload  |

---

## 🧪 Testing

### Run All Tests

```bash
# Unit tests
npm run test

# E2E tests (requires PostgreSQL & Redis)
npm run test:e2e

# Test coverage report
npm run test:cov

# Watch mode for development
npm run test:watch
```

### Test Statistics

- **Total Tests**: 29 (19 unit + 10 E2E)
- **Unit Test Coverage**: 100% on core services
- **E2E Coverage**: All webhook scenarios validated

### E2E Test Requirements

E2E tests need PostgreSQL and Redis running:

```bash
# Option 1: Use Docker Compose V2
docker compose up -d postgres redis
npm run test:e2e

# Option 2: GitHub Actions (automatic)
# See .github/workflows/ci.yml
```

### Test Structure

Tests use a **factory pattern** for maintainability:

```typescript
// Example E2E test
const org = await factory.organizations.create({ balance: 5000 });
const card = await factory.cards.create({ organizationId: org.id });

const response = await api.sendWebhook({
    cardNumber: card.cardNumber,
    amount: 150,
});

api.expectApproved(response);
```

---

## 🔄 CI/CD

### Automated Workflows

The project uses **GitHub Actions** for continuous integration:

**📋 CI Pipeline** (`.github/workflows/ci.yml`)

- ✓ ESLint with zero-warning policy
- ✓ TypeScript type checking
- ✓ Unit tests with coverage
- ✓ E2E tests with PostgreSQL & Redis
- ✓ Build verification
- ✓ npm security audit
- ✓ Docker build validation

**📊 PR Checks** (`.github/workflows/pr-checks.yml`)

- Merge conflict detection
- Coverage report comments
- Combined quality checks

**📦 Dependency Audit** (`.github/workflows/dependency-check.yml`)

- Weekly security scans
- Outdated package reports

### Documentation

Comprehensive CI/CD documentation available:

- **[CI/CD Overview](docs/CI_CD.md)** - Full setup guide
- **[CI/CD Quick Reference](docs/CI_CD_QUICK_REF.md)** - Commands and tips
- **[Setup Complete Guide](docs/CI_CD_SETUP_COMPLETE.md)** - Implementation details

### Local CI Simulation

Run the same checks locally before pushing:

```bash
# Lint check (no auto-fix)
ESLINT_USE_FLAT_CONFIG=false npm run lint:check

# Format check
npm run format:check

# Type check
npx tsc --noEmit

# All tests
npm run test:cov
npm run test:e2e

# Build
npm run build
```

---

## 🗄 Database Schema

### Entities

**Organization**

```typescript
{
  id: UUID (PK)
  name: string
  balance: decimal(10,2)
  createdAt: timestamp
  updatedAt: timestamp

  // Relations
  cards: Card[]
}
```

**Card**

```typescript
{
  id: UUID (PK)
  cardNumber: string (unique)
  organizationId: UUID (FK)
  dailyLimit: decimal(10,2)
  monthlyLimit: decimal(10,2)
  dailyUsage: decimal(10,2)
  monthlyUsage: decimal(10,2)
  lastResetDate: timestamp
  createdAt: timestamp
  updatedAt: timestamp

  // Relations
  organization: Organization
  transactions: Transaction[]
}
```

**Transaction**

```typescript
{
  id: UUID (PK)
  cardId: UUID (FK)
  amount: decimal(10,2)
  status: enum (APPROVED, REJECTED, PENDING)
  timestamp: timestamp
  stationInfo: JSON (nullable)
  rejectionReason: string (nullable)
  createdAt: timestamp

  // Relations
  card: Card
}
```

### Automatic Limit Resets

The system automatically resets card limits:

- **Daily Reset**: When current date > lastResetDate
- **Monthly Reset**: When current month > lastResetDate month

Resets happen transparently during transaction processing.

---

## ⚡ Performance Optimizations

### Implemented

- ✅ **Redis Caching**: Organization and card lookups cached
- ✅ **Database Transactions**: Atomic operations prevent race conditions
- ✅ **Connection Pooling**: TypeORM connection pooling enabled
- ✅ **Cache Invalidation**: Smart cache clearing on updates
- ✅ **Database Indexes**: 6 indexes on frequently queried fields
    - `idx_cards_card_number`: Card number lookups
    - `idx_cards_organization_id`: Organization card queries
    - `idx_transactions_card_id`: Card transaction history
    - `idx_transactions_timestamp`: Time-based queries
    - `idx_transactions_status`: Status filtering
    - `idx_transactions_card_id_timestamp`: Composite for card history
- ✅ **Rate Limiting**: Webhook endpoint protected (10 req/sec per IP)
- ✅ **Idempotency**: Optional idempotency keys prevent duplicate transaction processing (24-hour retention)
- ✅ **Structured Logging**: Winston with file output and error tracking
- ✅ **Health Monitoring**: `/health` endpoint with database connectivity check

### Recommended (Future Enhancements)

- [ ] **Metrics**: Prometheus/Grafana integration
- [ ] **Request Tracing**: Distributed tracing with OpenTelemetry
- [ ] **Query Optimization**: Add EXPLAIN ANALYZE monitoring

---

## 🤝 Contributing

### Development Workflow

1. Create a feature branch
2. Make your changes
3. Run tests and linting locally
4. Submit a pull request
5. CI pipeline validates your changes

### Code Style

- **Indentation**: 4 spaces
- **Formatter**: Prettier
- **Linter**: ESLint with TypeScript rules
- **Naming**: camelCase for variables, PascalCase for classes

```bash
# Auto-format code
npm run format

# Auto-fix linting issues
npm run lint
```

### Testing Requirements

- All new features must include unit tests
- API changes must include E2E tests
- Maintain >80% code coverage

---

## 🔗 Additional Resources

### Project Documentation

- **[Entity-Relationship Diagram (ERD)](docs/ERD.md)** - Database schema and relationships
- **[Assumptions & Design Decisions](docs/ASSUMPTIONS.md)** - Architecture rationale and trade-offs
- **[CI/CD Overview](docs/CI_CD.md)** - Full setup guide
- **[CI/CD Quick Reference](docs/CI_CD_QUICK_REF.md)** - Commands and tips
- **[Setup Complete Guide](docs/CI_CD_SETUP_COMPLETE.md)** - Implementation details

### External Documentation

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [Redis Documentation](https://redis.io/docs)
- [Docker Documentation](https://docs.docker.com)

## Disclaimer

Build by Fordyce Gozali (forddyce92@gmail.com) for demonstrations purposes.
