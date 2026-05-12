# Testing Guide

This repository is Docker-first. The host only needs Docker.

Run commands from the frontend project root.

In the monorepo:

```bash
cd /home/juniel/Documentos/reservation-system/frontend
```

In the standalone repository:

```bash
cd aurum-reservation-frontend
```

No host Node.js, pnpm, or Playwright installation is required.

## Quality Gate

Runs dependency install, ESLint, Vitest, and production build with Node 24:

```bash
docker run --rm \
  -v "$PWD:/app" \
  -v aurum-frontend-node-modules-quality:/app/node_modules \
  -v aurum-frontend-next-quality:/app/.next \
  -w /app \
  node:24-alpine \
  sh -lc "corepack enable && corepack prepare pnpm@10.19.0 --activate && pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm build"
```

## Mocked E2E and PDF Contract Gate

Runs Playwright `1.60.0` with Node 24 against mocked API routes and axe-core accessibility scans.
This intentionally excludes `LIVE_E2E` so the standalone frontend repository can validate without
the auth and reservation services running.

```bash
docker run --rm --ipc=host \
  -v "$PWD:/app" \
  -v aurum-frontend-node-modules-playwright:/app/node_modules \
  -v aurum-frontend-next-playwright:/app/.next \
  -v aurum-frontend-playwright-report:/app/playwright-report \
  -v aurum-frontend-test-results:/app/test-results \
  -w /app \
  node:24-bookworm \
  bash -lc "corepack enable && corepack prepare pnpm@10.19.0 --activate && pnpm install --frozen-lockfile && pnpm exec playwright --version | grep 'Version 1.60.0' && pnpm exec playwright install --with-deps chromium && unset LIVE_E2E FRONTEND_BASE_URL MANUAL_UI_EVIDENCE && pnpm exec playwright test tests/e2e/reservations.spec.ts tests/e2e/pdf-ui-contract.spec.ts tests/e2e/accessibility.spec.ts --project=chromium --project=mobile-chrome"
```

## Runtime Image Gate

Builds the production image that is used by the standalone delivery:

```bash
docker build --pull --tag aurum-reservation-frontend:ci .
```

## Full Stack Live E2E

The live stack scenarios require the monorepo Docker Compose environment because they depend on
the C# auth service, Python reservation service, and PostgreSQL databases.

From `/home/juniel/Documentos/reservation-system`:

```bash
./scripts/test-all.sh
./scripts/capture-ui-evidence.sh
./scripts/audit-sbom.sh
```

## CI Gate

GitHub Actions runs `.github/workflows/ci.yml` on `push` to `main`, pull requests targeting `main`,
and manual dispatch.

Standalone required check:

- `frontend-quality`

## Evidence

Playwright writes evidence under these paths in CI:

- `playwright-report`
- `test-results`

These paths are ignored by Git and uploaded by GitHub Actions when the standalone CI runs.
