# AGENTS.md

Front Next.js do EaiMesa. API: **eaimesa-backend** (Laravel, porta 8000).

Produto e contratos: [`docs/`](docs/README.md). Spec e código mudam juntos (`.cursor/rules/docs-sync.mdc`).

Não invente endpoint. Um único app: `/` landing, `/login` `/cadastro` `/painel/*`, `/{slug}` cardápio, `/garcom`, `/admin`.

`packages/shared` (zod) vive neste repo. O backend Laravel reimplementa as regras em PHP (`app/Support`).

## Cursor Cloud

Não fazer teste manual de UI/desktop neste ambiente: browser, computerUse, screen recording. O Mac local cobre QR/celular.

Validar com `pnpm typecheck`. Pedido explícito (`/no-test`) prevalece.
