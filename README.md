# Frontend

Aplicação web Next.js + React + TypeScript para login/cadastro e gestão de reservas.

## Responsabilidade

- Consumir o `auth-service` para cadastro/login.
- Guardar access/refresh token em cookies `HttpOnly` pelo BFF Next.js.
- Enviar `Authorization: Bearer <token>` para o `reservation-service` apenas server-side, pelo BFF.
- Exigir CSRF double-submit em mutações same-origin.
- Permitir listagem, criação, edição, exclusão e exclusão em lote de reservas.
- Permitir cadastro e exclusão de locais e salas.

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

## Sessão e BFF

O navegador chama apenas rotas same-origin em `/api/*`. Os route handlers Next.js chamam:

- `AUTH_API_INTERNAL_URL` para login, cadastro, refresh e `/me`.
- `RESERVATION_API_INTERNAL_URL` para locais, salas e reservas.

O BFF recebe o JWT emitido pelo C#, grava access token e refresh token em cookies `HttpOnly`
e encaminha o JWT para o Python via `Authorization: Bearer` no servidor. O React recebe apenas
`user`, `expiresAt` e `csrfToken`.

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
```

## Rodar via Docker

```bash
./scripts/dev-up.sh
```

Este projeto é Docker-first. Não é necessário instalar Node, pnpm ou Playwright no host.

## Testes

Na raiz:

```bash
./scripts/test-all.sh
```

Somente o frontend, em container:

```bash
docker run --rm -v "$PWD/frontend:/app" -v aurum-frontend-node-modules:/app/node_modules -w /app node:24-alpine \
  sh -lc "corepack enable && corepack prepare pnpm@10.19.0 --activate && pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm build"
```
