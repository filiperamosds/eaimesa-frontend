# ADR-032: Taxa de serviço para o garçom que abriu a mesa

**Status:** Aceito
**Data:** 2026-08-27
**Relaciona:** [ADR-007](ADR-007-staff-garcom.md), [ADR-021](ADR-021-caixa-encerra-comanda.md)

## Contexto

A taxa de serviço já aparece na parcial e no cupom, mas `/painel/financeiro` não mostrava quanto cada funcionário deve receber.

## Decisão

1. Quem abre a mesa (QR em `/garcom`) fica vinculado à ocupação (`waiter_member_id`).
2. No fechamento, a `service_fee_cents` da comanda é desse funcionário.
3. `/painel/financeiro` lista **Taxa de serviço por funcionário** (`GET /v1/owner/finance/summary?groupBy=waiter`) e um KPI com o total da taxa no período.
4. Sem rateio entre vários garçons na mesma mesa.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Usar quem fechou a comanda | Costuma ser o caixa, não quem atendeu |
| Ratear a taxa | Fora do pedido |

## Consequências

- `finance-report.tsx` passa a pedir `groupBy=waiter` e mostra `serviceFeeCents` por nome.
