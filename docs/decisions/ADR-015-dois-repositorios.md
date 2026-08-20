# ADR-015 — Dois repositórios (API e front)

## Status

Aceito (supersede o monorepo de [ADR-001](ADR-001-stack.md) no que diz respeito a um único git). Stack da API: [ADR-016](ADR-016-laravel-mysql.md).

## Contexto

Deploy (Hostinger Unlimited para o Next, API + MySQL à parte) e dois processos locais pedem git separados.

## Decisão

| Repo | URL | Conteúdo |
|------|-----|----------|
| **eaimesa-backend** | https://github.com/filiperamosds/eaimesa-backend | Laravel 13, MySQL 8, docs, contrato `/v1` |
| **eaimesa-frontend** | https://github.com/filiperamosds/eaimesa-frontend | Next.js (um app: landing, painel, `/{slug}`, `/admin`) + `packages/shared` (zod) |

Local: **dois terminais** — API `:8000`, front `:3000` (rewrite `/v1` → API). Front único continua [ADR-003](ADR-003-frontend-unico.md).

## Consequências

- Tipos TS compartilhados ficam só no front (`packages/shared`). No Laravel as regras equivalentes estão em `app/Support`.
- Cookies: o browser fala com `:3000`; o Next faz proxy. `APP_URL` no backend = origem do front.
- O monorepo antigo (`filiperamosds/eaimesa`) fica como arquivo; código novo vai para estes dois destinos.
