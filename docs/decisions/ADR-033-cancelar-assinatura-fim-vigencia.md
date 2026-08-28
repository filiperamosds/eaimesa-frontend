# ADR-033: Cancelar assinatura no fim da vigência

**Status:** Aceito  
**Data:** 2026-08-28  
**Relaciona:** [ADR-012](ADR-012-planos.md), [ADR-028](ADR-028-assinatura-recorrente-planos.md)  
**API:** mesmo número no Laravel (`eaimesa-backend`)

## Contexto

O painel permitia pagar, subir de plano e agendar downgrade, mas o dono não conseguia **parar as próximas cobranças** e usar o que já pagou até o fim do mês.

## Decisão

1. CTA **Cancelar assinatura** no plano atual em `/painel/pagamento` (confirmação antes de enviar).
2. `POST /v1/billing/cancel-subscription` cancela a recorrência no Asaas; o front **não** fala com o gateway.
3. Status permanece `active` até `currentPeriodEndsAt`. Banner: sem novas cobranças; acesso até a data.
4. Depois da data, o painel trata como vigência encerrada (`past_due` / pagar de novo). Sem reembolso.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Bloquear o painel no clique | O mês já está pago |
| Botão só no console `/admin` | Self-serve do dono |

## Consequências

- `GET /v1/billing/me`: `canCancelSubscription`, `cancellation: { canceledAt, accessUntil }`.
- Erros: `ALREADY_CANCELED`, `NOTHING_TO_CANCEL`.
