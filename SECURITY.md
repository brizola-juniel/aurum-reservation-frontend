# Security Policy

## Supported Version

Security maintenance targets the current `main` branch and the latest published release of
`aurum-reservation-frontend`.

## Reporting a Vulnerability

Report suspected vulnerabilities privately through GitHub Security Advisories when this project
is published as `brizola-juniel/aurum-reservation-frontend`. If advisories are unavailable,
contact the repository owner directly before publishing exploit details.

Include:

- Impacted version, commit, or release tag.
- Steps to reproduce.
- Expected and observed behavior.
- Evidence such as request/response samples with secrets redacted.

Do not include real secrets, production tokens, customer data, or personal data in public issues.

## Security Model

- The browser talks only to same-origin `/api/*` routes exposed by the Next.js BFF.
- Access and refresh tokens are stored in `HttpOnly` cookies by the BFF.
- JWT forwarding to the reservation API happens only server-side.
- Mutating BFF routes require CSRF protection through `X-CSRF-Token`.
- JWTs and refresh tokens must never be persisted in `localStorage`, `sessionStorage`, logs, or
  client-visible JSON payloads.
- No `NEXT_PUBLIC_*` backend URLs are part of the delivery contract.
- The default Content Security Policy restricts `connect-src` to `'self'`.
- Production deployments must set `BFF_COOKIE_SECURE=true` behind HTTPS.
- `BFF_ALLOW_INSECURE_COOKIES=true` is only acceptable for local Docker over HTTP.
- Logout must revoke the upstream refresh token before clearing local session cookies.
- Runtime endpoints are configured by environment variables, not by committed secrets.

## Dependency and Supply Chain Controls

- GitHub Actions runs frontend gates inside Docker containers.
- The Node gate uses Node 24 and executes lint, Vitest, and production build.
- The Playwright gate verifies Playwright `1.60.0` and executes only mocked/PDF contract E2E specs.
- The runtime image gate builds the production Docker image.
- Dependabot monitors npm, GitHub Actions, and Docker updates weekly.
- Dependency updates must pass the same CI gates before merging.

## Local Hardening Checklist

Before publishing a frontend change:

1. Run lint, unit tests, build, and mocked/PDF E2E in Docker.
2. Confirm `LIVE_E2E`, `FRONTEND_BASE_URL`, and `MANUAL_UI_EVIDENCE` are not set for the standalone
   mocked E2E gate.
3. Review BFF changes for accidental token exposure.
4. Keep `.env`, `.env.local`, reports, traces, screenshots, and logs out of commits unless they are
   intentionally redacted evidence.
