# Fatia 27 — Inspeção do painel (impersonate)

Operador do console entra no painel do dono para ver o estabelecimento como ele vê. **Não** é módulo de plano: o cookie `eaimesa_platform` continua; a API emite um JWT owner temporário (1 hora, claim `impersonatorId`).

## Inclui

- `/admin/bares`: clique no estabelecimento abre um dialog (plano ativo, status, dono, **slug**, datas de trial/vigência, últimos pagamentos). Ações no dialog: **Entrar como dono**, importar cardápio, ajustar datas, suspender/reativar. Troca de slug só aqui.
- `GET /v1/platform/venues/{id}` — detalhe + até 12 `billing_events`.
- `POST /v1/platform/venues/{id}/impersonate` — Set-Cookie `eaimesa_owner` (TTL 1h, `impersonatorId`).
- `POST /v1/platform/impersonate/stop` — apaga só o cookie owner; volta a `/admin/bares`.
- Faixa no `/painel`: estabelecimento + e-mail do operador; **Sair da inspeção**.
- Bloqueio de escrita: checkout, cartões, convite/reenvio de equipe → 403 `IMPERSONATION_FORBIDDEN`.
- `GET /v1/auth/me` devolve `impersonation: { byEmail, venueName }` e **não** exige e-mail verificado nessa sessão.

## Não inclui

- Impersonate como módulo do plano / SKU
- Autorizar `/v1/owner/*` com o cookie platform
- Audit log em tabela (fica `Log::info` de start/stop)
- 2FA do console
- Editar o JWT do dono real (a sessão dele no outro browser não muda)

## Fluxo

1. Operador em `/admin/bares` clica no bar.
2. Dialog carrega plano, datas e pagamentos.
3. Confirma **Entrar como dono** → cookie owner temporário → `/painel`.
4. Opera o cardápio/salão como suporte. Checkout, cartões e convite de equipe recusam.
5. **Sair da inspeção** (faixa ou menu) chama `stop` e volta ao console. O cookie platform permanece.

Ver [ADR-045](../decisions/ADR-045-impersonate-suporte.md).
