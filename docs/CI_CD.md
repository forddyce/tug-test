# CI/CD Pipeline Documentation

## Overview

The TUG project uses GitHub Actions for continuous integration and code quality checks. Since we're not deploying yet, the pipeline focuses on ensuring code quality, running tests, and validating builds.

## Workflows

### 1. CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:** Push to `main` or `develop` branches, Pull Requests

**Jobs:**

- **Lint**: ESLint validation with auto-fix disabled
- **Type Check**: TypeScript compilation check without emitting files
- **Unit Tests**: Runs all unit tests with coverage reporting
- **E2E Tests**: Full integration tests with PostgreSQL and Redis services
- **Build**: Verifies application builds successfully
- **Security Audit**: Checks for npm package vulnerabilities
- **Docker Build**: Validates Dockerfile builds correctly
- **Summary**: Aggregates all job results

**Features:**

- Parallel job execution for faster feedback
- Dependency caching for improved performance
- Coverage reporting to Codecov (optional)
- GitHub Services for PostgreSQL and Redis in E2E tests

### 2. PR Checks (`.github/workflows/pr-checks.yml`)

**Triggers:** Pull Request opened, synchronized, or reopened

**Features:**

- Merge conflict detection
- Automatic coverage report comments on PRs
- Runs all quality checks before merge

### 3. Dependency Check (`.github/workflows/dependency-check.yml`)

**Triggers:** Weekly schedule (Mondays at 9 AM UTC) or manual dispatch

**Features:**

- Lists outdated packages
- Security vulnerability scanning
- Automated summary reporting

## Local Testing

Before pushing, run these commands locally:

```bash
# Format check
npm run format:check

# Lint check (without auto-fix)
npm run lint:check

# Type check
npx tsc --noEmit

# Unit tests with coverage
npm run test:cov

# E2E tests (requires Docker)
docker-compose up -d postgres redis
npm run test:e2e
```

## Setting Up Codecov (Optional)

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Add `CODECOV_TOKEN` to GitHub Secrets:
    - Go to Settings → Secrets and variables → Actions
    - New repository secret: `CODECOV_TOKEN`
4. The CI pipeline will automatically upload coverage reports

## Branch Protection Rules (Recommended)

Configure in GitHub: Settings → Branches → Add rule

**Suggested rules for `main` branch:**

- ✅ Require pull request before merging
- ✅ Require approvals (1+)
- ✅ Require status checks to pass:
    - `Lint Code`
    - `TypeScript Type Check`
    - `Unit Tests`
    - `E2E Tests`
    - `Build Application`
- ✅ Require branches to be up to date
- ✅ Require conversation resolution before merging

## Environment Variables for CI

The E2E tests job uses these environment variables:

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

## Workflow Status Badges

Add to your README.md:

```markdown
![CI Pipeline](https://github.com/YOUR_USERNAME/tug/actions/workflows/ci.yml/badge.svg)
![PR Checks](https://github.com/YOUR_USERNAME/tug/actions/workflows/pr-checks.yml/badge.svg)
```

## Performance Tips

- **Caching**: Node modules are cached automatically (`cache: 'npm'`)
- **Parallel Jobs**: All jobs except Summary run in parallel
- **Docker Layer Caching**: Uses GitHub Actions cache for Docker builds

## Future Enhancements (When Ready to Deploy)

- Add deployment jobs to staging/production
- Container registry push (Docker Hub, GitHub Packages, AWS ECR)
- Database migrations in CI
- Performance testing
- Load testing with k6 or Artillery
- Visual regression testing
- Semantic versioning and automated releases
