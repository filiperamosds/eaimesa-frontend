# ADR-019: Vigência paga empilha na data atual

**Status:** Aceito  
**Data:** 2026-08-22

## Contexto

O dono pode pagar nos últimos dias do trial (ou renovar com vigência ainda aberta). Se `current_period_ends_at` virasse `agora + 30`, os dias que ainda restam seriam queimados.

Não há tabela de períodos: só `venues.trial_ends_at` e `venues.current_period_ends_at`.

## Decisão

1. Pagamento confirmado marca `subscription_status = active` na hora (o dono já pagou).
2. `current_period_ends_at = max(agora, trial_ends_at, current_period_ends_at) + paid_period_days` (default 30). Datas no passado não entram no `max`.
3. Sem linha de “ciclo” nem scheduler para “esperar o trial acabar”. O restante do trial/mês entra na nova data.

Exemplos (`paid_period_days = 30`):

| Situação | Novo `current_period_ends_at` |
|----------|-------------------------------|
| Trial acaba em 3 dias | trial_ends_at + 30 |
| Vigência paga acaba em 5 dias | current_period_ends_at + 30 |
| Trial/vigência já venceu (`past_due`) | agora + 30 |

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Sempre `agora + 30` | Pagar cedo encurta o que já estava coberto |
| Ficar em `trial` até `trial_ends_at` e só então virar `active` | Precisa de job; o pagamento já aconteceu |
| Tabela de períodos / faturas de ciclo | Overhead; a data no venue resolve |

## Consequências

- Stub e webhook Asaas usam a mesma regra ao ativar o venue
- Front mostra a data empilhada antes de pagar
- Asaas `MONTHLY` continua cobrando no ciclo do provedor; o direito de uso no EaiMesa é a data empilhada
