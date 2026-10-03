# ADR-045: Impersonate de suporte (JWT owner temporário)

**Status:** Aceito  
**Data:** 2026-10-02  
**Depende de:** [ADR-013](ADR-013-console-saas.md), [ADR-008](ADR-008-login-unificado-role.md)

## Contexto

Suporte precisa ver o painel do estabelecimento (cardápio, mesas, config) sem pedir a senha do dono. O cookie `eaimesa_platform` **não** autoriza `/v1/owner/*`. Um “módulo impersonate” no plano misturaria produto vendido com operação interna.

## Decisão

- Continua **dois cookies**. Impersonate **seta** `eaimesa_owner` com o `sub` do dono, `venueId` e `impersonatorId` (id do `platform_users`).
- TTL curto: `IMPERSONATE_JWT_TTL_HOURS` (default **1**), distinto do JWT normal do dono.
- `eaimesa_platform` permanece. Stop só esquece o cookie owner.
- Escritas de billing (checkout, cartões, cancelar/downgrade) e convite/reenvio de staff → 403 `IMPERSONATION_FORBIDDEN`. O resto do painel (cardápio, mesas) segue liberado para o suporte atuar.
- E-mail não verificado do dono **não** bloqueia `GET /v1/auth/me` nessa sessão.
- UI: lista de bares sem botões laterais; clique abre dialog (plano, datas, pagamentos, ações).

## Alternativas rejeitadas

| Opção | Por quê não |
|-------|-------------|
| Cookie platform nas rotas owner | Quebra tenancy e RBAC; um bug vaza todos os venues |
| Módulo de plano “impersonate” | Não é feature vendida ao dono |
| Senha do dono no console | O operador não deve conhecê-la |
| TTL igual ao JWT do dono (12h) | Sessão de suporte longa demais se o browser ficar aberto |

## Consequências

- Dois JWTs convivem no mesmo browser (console + inspeção).
- Stop exige cookie platform válido; se expirou, o front tenta logout owner e manda de volta a `/admin/bares`.
- Log de start/stop com `platformUserId`, `venueId`, IP — sem senha.
