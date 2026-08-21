# ADR-016 — API Laravel + MySQL

## Status

Aceito. Substitui Fastify + Postgres no **eaimesa-backend** (stack Node original: [ADR-001](ADR-001-stack.md)). Dois git: [ADR-015](ADR-015-dois-repositorios.md).

## Contexto

Hospedagem típica (PHP + MySQL) e o pedido de um backend Laravel. O contrato HTTP (`docs/api/endpoints.md`) e o modelo (`docs/data/schema.md`) permanecem. A API sobe na porta **8000**.

## Decisão

| Antes (Fastify, arquivo) | Agora |
|--------------------------|--------|
| Fastify + Drizzle | Laravel 13 (PHP 8.3) na **raiz** do eaimesa-backend |
| PostgreSQL 16 | **MySQL 8** |
| Índices parciais `WHERE status = open` | Colunas nullable + UNIQUE (NULL = fechado). Hostinger/MariaDB **não aceita** `GENERATED ALWAYS` com `IF`/`CASE` (erro 1901); o Eloquent preenche `open_table_id` / `open_session_phone` no `saving`. |
| Cookie JWT HS256 | Mesmos nomes (`eaimesa_owner`, `eaimesa_guest`, `eaimesa_platform`) e claims |

Front único (ADR-003) não muda; no Next, `API_URL=http://localhost:8000`.

## Consequências

- RLS do Postgres não existe no MySQL: tenancy continua só no `venue_id` da sessão.
- `packages/shared` (zod) não roda no PHP — regras reimplementadas em `app/Support`.
- O front aponta para Laravel; o Fastify do monorepo antigo não faz mais parte do dia a dia.
