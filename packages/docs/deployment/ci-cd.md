# CI / CD

KitchenAsty uses **GitHub Actions** for continuous integration. The pipeline is defined in `.github/workflows/ci.yml`.

## Pipeline Overview

```
┌──────┐   ┌────────────┐   ┌──────────────────┐   ┌─────────┐
│ Lint │   │ Unit Tests │   │ Integration Tests │   │  Audit  │
└──┬───┘   └─────┬──────┘   └────────┬─────────┘   └─────────┘
   │             │                    │
   └─────────────┴────────────────────┘
                  │
              ┌───┴───┐    ┌──────────┐
              │ Build │    │ E2E Tests│
              └───────┘    └──────────┘
```

## Jobs

### Lint

- Installs dependencies
- Generates Prisma client
- Runs TypeScript type checking on all packages (`shared`, `server`, `admin`, `storefront`)

### Unit Tests

- Runs shared package tests with Vitest
- Runs server unit tests (`src/__tests__/unit`)

### Integration Tests

- Runs server integration tests (`src/__tests__/integration`)

### E2E Tests

- Starts a PostgreSQL service container
- Pushes schema and seeds the database
- Installs Playwright + Chromium
- Runs Playwright E2E tests
- Uploads test results as an artifact

### Security Audit

- Runs `npm audit` at high severity level
- Non-blocking (uses `|| true`)

### Build

- Depends on: Lint, Unit Tests, Integration Tests
- Builds all packages in order: shared → server → admin → storefront
- Uploads admin and storefront builds as artifacts

## Adding Auto-Deploy

To extend the pipeline for automatic deployment, add a deploy job after build:

```yaml
deploy:
  name: Deploy
  runs-on: ubuntu-latest
  needs: [build]
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/download-artifact@v4
      with:
        name: admin-dist
        path: admin-dist/
    - uses: actions/download-artifact@v4
      with:
        name: storefront-dist
        path: storefront-dist/
    # Add your deployment steps here:
    # - SSH to server and copy files
    # - Push to container registry and restart
    # - Deploy to cloud platform
```

## Environment Variables for CI

The E2E job uses these environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Points to the CI PostgreSQL service |
| `JWT_SECRET` | `test-secret` |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` |
| `CI` | `true` |
