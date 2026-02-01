# CI/CD Quick Reference

## Local Quality Checks (Before Pushing)

```bash
# Run all checks locally
ESLINT_USE_FLAT_CONFIG=false npm run lint:check   # No auto-fix, max 0 warnings
npm run format:check                                 # Prettier formatting check
npx tsc --noEmit                                    # Type check without build
npm run test:cov                                     # Unit tests with coverage
npm run test:e2e                                     # E2E tests (Docker required)
npm run build                                        # Build verification
```

## GitHub Actions Workflows

### 1. Main CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:** Push to `main`/`develop`, Pull Requests

**Jobs (run in parallel):**

```
┌─────────────────────┐
│   Lint Code         │  ✓ ESLint with --max-warnings=0
├─────────────────────┤
│   Type Check        │  ✓ TypeScript compilation
├─────────────────────┤
│   Unit Tests        │  ✓ 19 tests + coverage → Codecov
├─────────────────────┤
│   E2E Tests         │  ✓ 10 tests with PostgreSQL & Redis
├─────────────────────┤
│   Build             │  ✓ npm run build
├─────────────────────┤
│   Security Audit    │  ✓ npm audit --audit-level=moderate
├─────────────────────┤
│   Docker Build      │  ✓ Dockerfile verification
└─────────────────────┘
          │
          ↓
    ┌──────────┐
    │ Summary  │  ✓ Aggregate all results
    └──────────┘
```

### 2. PR Checks (`.github/workflows/pr-checks.yml`)

**Triggers:** PR opened/synchronized/reopened

- Detects merge conflicts
- Runs all quality checks
- Posts coverage report as PR comment

### 3. Dependency Check (`.github/workflows/dependency-check.yml`)

**Triggers:** Every Monday 9 AM UTC, manual dispatch

- Lists outdated packages
- Security vulnerability scan
- Summary in GitHub Actions

## Environment Variables in CI

E2E tests automatically use:

```yaml
NODE_ENV: test
DB_HOST: localhost
DB_PORT: 5432
DB_USERNAME: tug_user
DB_PASSWORD: tug_password
DB_NAME: tug_test
REDIS_HOST: localhost
REDIS_PORT: 6379
```

## Optional: Codecov Setup

1. Sign up: https://codecov.io
2. Add repository
3. GitHub Secrets → Add `CODECOV_TOKEN`
4. CI automatically uploads coverage ✓

## Files Created

```
.github/
└── workflows/
    ├── ci.yml                    # Main CI pipeline (7 jobs)
    ├── pr-checks.yml             # PR validation
    └── dependency-check.yml      # Weekly audits

docs/
├── CI_CD.md                      # Detailed documentation
└── CI_CD_SETUP_COMPLETE.md       # Setup summary

package.json                       # Added lint:check, format:check scripts
```

## Typical CI Run Time

- **Lint + Type Check:** ~30 seconds
- **Unit Tests:** ~15 seconds
- **E2E Tests:** ~10 seconds
- **Build:** ~20 seconds
- **Docker Build:** ~45 seconds
- **Total (parallel):** ~1-2 minutes ⚡

## When Things Fail

### ESLint Errors

```bash
ESLINT_USE_FLAT_CONFIG=false npm run lint  # Auto-fix
```

### Formatting Issues

```bash
npm run format  # Auto-format
```

### Test Failures

```bash
npm run test:watch        # Unit tests with watch
npm run test:e2e          # E2E locally
npm run test:debug        # Debug mode
```

### Type Errors

```bash
npx tsc --noEmit         # See all errors
```

## Adding New Workflows

Create `.github/workflows/your-workflow.yml`:

```yaml
name: Your Workflow
on: [push, pull_request]

jobs:
    your-job:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: '20'
                  cache: 'npm'
            - run: npm ci
            - run: npm run your-command
```

## Pro Tips

1. **Cache is automatic** - Node modules cached via `cache: 'npm'`
2. **Jobs run in parallel** - Fails fast on first error
3. **Docker layers cached** - Subsequent builds faster
4. **Zero warnings policy** - `--max-warnings=0` in lint:check
5. **Legacy ESLint config** - Uses `ESLINT_USE_FLAT_CONFIG=false` for .eslintrc.js

## What's Next?

When ready to deploy, add to [ci.yml](../.github/workflows/ci.yml):

```yaml
deploy:
    needs: [lint, type-check, unit-tests, e2e-tests, build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
        - name: Deploy
          # Your deployment here
```

---

**Status:** ✅ CI/CD fully configured and ready for GitHub!
