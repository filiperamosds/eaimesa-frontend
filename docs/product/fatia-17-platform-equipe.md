# Fatia 17 — Equipe de operadores SaaS

Quem já está no console cadastra colegas operadores. **Não** há tela pública de cadastro admin.

## Inclui

- `/admin/equipe` no console (nav **Equipe**)
- `GET /v1/platform/users` — `{ users: [{ id, email, name, active, createdAt }] }`
- `POST /v1/platform/users` — `{ email, password (mín. 8), name, active? }` → 201 o mesmo shape de um item
- Cookie `eaimesa_platform` (mesmo layout/proteção das outras `/admin/*`)
- Formulário **Convidar operador** + lista; toast de sucesso/erro; refetch após criar
- Seed bootstrap: `ops@eaimesa.local` / `Teste@123`

## Não inclui

- Cadastro público de operador (`/admin/cadastro` ou similar)
- PATCH / DELETE / desativar operador na UI
- SSO / 2FA / papéis distintos entre operadores
- Impersonate o dono

## Superfície

| Path | Quem |
|------|------|
| `/admin/equipe` | Operador autenticado |

Deslogado: o shell redireciona para `/admin/login` (401). Sem cookie platform a API responde 401.

## Contrato

Ver [endpoints](../api/endpoints.md). Rate limit do POST: 10/min/IP. E-mail único → 409 `EMAIL_TAKEN`. Body inválido → 400 `VALIDATION_ERROR`.

## Fluxo

1. Operador entra em `/admin/login` (`ops@eaimesa.local` no seed).
2. Abre **Equipe**, vê a lista (`GET /v1/platform/users`).
3. Preenche nome, e-mail e senha → `POST /v1/platform/users` com `active: true`.
4. Toast de sucesso; a lista atualiza. O colega entra em `/admin/login` com o e-mail novo.
