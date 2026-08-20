# ADR-001: Stack e monorepo

**Status:** Aceito (front único: [ADR-003](ADR-003-frontend-unico.md)). Um único git: **supersedido** por [ADR-015](ADR-015-dois-repositorios.md). Fastify + Postgres: **supersedido** por [ADR-016](ADR-016-laravel-mysql.md).  
**Data:** 2026-08-17

## Contexto

SaaS multi-tenant, API REST, Postgres. Time pequeno; precisa entregar MVP rápido com tipos compartilhados. A quantidade de apps web foi revista na fatia 1: **um** Next.js, não guest + staff separados.

## Decisão

- **Monorepo pnpm** com `eaimesa-backend` (Fastify) e `eaimesa-frontend` (Next.js único)
- **TypeScript** end-to-end
- **PostgreSQL 16** + **Drizzle**
- **Next.js** App Router para landing, painel do estabelecimento e cardápio público
- **Fastify** para API (REST)

## Alternativas consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| Repos separados | Deploy isolado | Types duplicados, drift |
| Go API | Performance | Dois ecossistemas TS/Go |
| Supabase-only | Rápido | RLS + custom claim flow menos flexível |

## Consequências

- Um PR pode cruzar API + UI
- Deploy: um front (Vercel ou similar) + Fly/Railway (API) + Neon/RDS (DB)
- Guest PWA e painel staff **não** são apps separados; entram como rotas em `eaimesa-frontend` (ADR-003)
