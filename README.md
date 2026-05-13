# Aurum Reservation Frontend

Aplicação web Next.js + React + TypeScript para login/cadastro e gestão de reservas da
Aurum Reservas Brasil.

Este README funciona nos dois formatos de entrega:

- Monorepo: `/home/juniel/Documentos/reservation-system/frontend`.
- Standalone: `aurum-reservation-frontend`.

Execute os comandos abaixo a partir da raiz do frontend. No monorepo, entre em `frontend` antes:

```bash
cd frontend
```

## Responsabilidade

- Consumir o `auth-service` para cadastro/login.
- Guardar access/refresh token em cookies `HttpOnly` pelo BFF Next.js.
- Enviar `Authorization: Bearer <token>` para o `reservation-service` apenas server-side, pelo BFF.
- Exigir CSRF double-submit em mutações same-origin.
- Permitir listagem, criação, edição, exclusão e exclusão em lote de reservas.
- Permitir cadastro, edição e exclusão confirmada de locais e salas.

## Stack

- Next.js 16 App Router.
- React 19.
- React Compiler 1.0 habilitado no `next.config.ts`.
- TypeScript 6 em modo estrito.
- Turbopack no desenvolvimento/build do Next.js.
- Tailwind CSS v4 via `@tailwindcss/postcss`, com tokens Aurum em `src/styles/app.css`.
- TanStack Query.
- React Hook Form.
- Zod.
- Lucide React.
- Vitest + Testing Library.
- Playwright.

## Automação GitHub

Quando este diretório é exportado como o repositório standalone `aurum-reservation-frontend`,
os arquivos em `.github/` ativam:

- GitHub Actions CI Docker-only.
- Gate Node 24 com lint, Vitest e build.
- Gate Playwright `1.60.0` com E2E mockado e contrato visual/funcional do PDF, sem `LIVE_E2E`.
- Upload de evidências Playwright.
- Dependabot semanal para npm, GitHub Actions e Docker.

No monorepo, esses arquivos são a fonte exportável do frontend; a orquestração completa continua
nos scripts Docker da raiz do produto.

## Sessão e BFF

O navegador chama apenas rotas same-origin em `/api/*`. Os route handlers Next.js chamam:

- `AUTH_API_INTERNAL_URL` para login, cadastro, refresh e `/me`.
- `RESERVATION_API_INTERNAL_URL` para locais, salas e reservas.

O BFF recebe o JWT emitido pelo C#, grava access token e refresh token em cookies `HttpOnly`
e encaminha o JWT para o Python via `Authorization: Bearer` no servidor. O React recebe apenas
`user`, `expiresAt` e `csrfToken`.

No logout, o BFF chama o `auth-service` para revogar o refresh token antes de limpar os
cookies locais. Em produção, cookies inseguros só são permitidos se
`BFF_ALLOW_INSECURE_COOKIES=true` e `BFF_INSECURE_COOKIE_CONTEXT=local-docker` estiverem
definidos explicitamente para Docker local.

## UI system

A identidade visual da Aurum Reservas Brasil usa Tailwind CSS v4 com tokens `aurum-*`
definidos em `src/styles/app.css`. Estilos novos devem preferir utilitários Tailwind
e esses tokens, evitando voltar a CSS customizado amplo para layout/componentes.

Primitives compartilhadas ficam em `src/components/ui.tsx`:

- `Button` e `IconButton` para ações textuais e ações só com ícone.
- `Field`, `FieldError`, `HelpText` e `fieldControlClass` para formulários acessíveis.
- `FeedbackMessage` para mensagens de erro de domínio/API.

Componentes de tela devem compor esses primitives antes de criar novas classes
locais para botões, inputs, selects, textareas e mensagens.

## Supply chain

O projeto usa `pnpm.overrides` para forçar `postcss@8.5.14`, removendo a vulnerabilidade
moderada reportada para `postcss <8.5.10` em auditoria `pnpm audit --prod`.

## Variáveis

```env
AUTH_API_INTERNAL_URL=http://auth-service:8080
RESERVATION_API_INTERNAL_URL=http://reservation-service:8000
BFF_COOKIE_SECURE=false
BFF_ALLOW_INSECURE_COOKIES=true
BFF_INSECURE_COOKIE_CONTEXT=local-docker
```

No standalone, ajuste `AUTH_API_INTERNAL_URL` e `RESERVATION_API_INTERNAL_URL` para os endpoints
internos disponíveis no seu ambiente Docker ou orquestrador.

## Rodar via Docker no standalone

```bash
docker build -t aurum-reservation-frontend .
docker run --rm -p 3000:3000 \
  -e AUTH_API_INTERNAL_URL=http://auth-service:8080 \
  -e RESERVATION_API_INTERNAL_URL=http://reservation-service:8000 \
  -e BFF_COOKIE_SECURE=false \
  -e BFF_ALLOW_INSECURE_COOKIES=true \
  -e BFF_INSECURE_COOKIE_CONTEXT=local-docker \
  aurum-reservation-frontend
```

Este projeto é Docker-first. Não é necessário instalar Node, pnpm ou Playwright no host.

No monorepo, a stack completa continua sendo iniciada a partir da raiz:

```bash
./scripts/dev-up.sh
```

## Testes

Gate de qualidade do frontend:

```bash
docker run --rm \
  -v "$PWD:/app" \
  -v aurum-frontend-node-modules-quality:/app/node_modules \
  -v aurum-frontend-next-quality:/app/.next \
  -w /app \
  node:24-alpine \
  sh -lc "corepack enable && corepack prepare pnpm@10.19.0 --activate && pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm build"
```

Gate Playwright mockado e contrato PDF:

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

Gate completo do monorepo, executado a partir da raiz do produto:

```bash
./scripts/test-all.sh
```

Detalhes de validação ficam em `TESTING.md`; política de segurança fica em `SECURITY.md`.
