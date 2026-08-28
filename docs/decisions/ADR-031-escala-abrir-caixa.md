# ADR-031: Escala na abertura do caixa

**Status:** Aceito
**Data:** 2026-08-27
**Relaciona:** [ADR-021](ADR-021-caixa-encerra-comanda.md), [ADR-024](ADR-024-kanban-painel-categorias.md)

## Contexto

Funcionário fora do turno ainda consegue entrar e lançar pedido. O estabelecimento precisa, na abertura do caixa, dizer quem está na escala.

## Decisão

1. Flag `requireShiftOnOpenCash` no venue (default **false**). Checkbox em **Estabelecimento** (plano Auto atendimento).
2. Com a flag ligada, `/painel/caixa` e `/garcom/caixa` listam garçom e caixa (`GET /v1/staff/cash-sessions/roster`). **Todos começam marcados.** Desmarcar = fora da escala. Painel Kanban **não** entra na lista.
3. `POST /v1/staff/cash-sessions` envia `onShiftMemberIds` dos marcados. Sem o array → `400 SHIFT_REQUIRED`.
4. Login de membership inativa mostra **“Seu usuário está inativo.”** (`403 STAFF_INACTIVE`).
5. Fechar o caixa não reativa ninguém. Desligar a flag não reativa em massa.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Caixa chama `GET /v1/owner/staff` | Rota do dono; caixa não tem esse cookie |
| Incluir painel na escala | Monitor da cozinha/bar não sai de turno com o caixa |
| Pré-marcar só os já ativos | O pedido é “seleciona tudo”; o caixa desmarca quem falta |

## Consequências

- Config em `config-bar-panels.tsx`.
- Lista na abertura em `cash-register-panel.tsx`.
- Login trata `STAFF_INACTIVE`.
