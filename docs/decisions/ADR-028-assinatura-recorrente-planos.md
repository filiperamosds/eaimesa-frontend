# ADR-028: Assinatura recorrente + troca de planos no painel

**Status:** Aceito  
**Data:** 2026-08-26  
**Relaciona:** [ADR-012](ADR-012-planos.md), [ADR-018](ADR-018-payment-gateway-asaas.md), [ADR-019](ADR-019-vigencia-empilhada.md), [ADR-020](ADR-020-cartao-no-painel.md)  
**API:** núcleo no Laravel (`eaimesa-backend`, mesmo número)

## Contexto

O checkout Asaas já cobrava a 1ª mensalidade no painel e o PIX usava hosted. Faltava alinhar `/painel/pagamento` ao contrato de **recorrência no gateway**, **upgrade com prorrata**, **downgrade agendado** e **vários cartões** (máscara `**** last4`).

## Decisão

1. Fonte da recorrência = subscription Asaas. O front **não** “paga de novo” o mesmo plano `active` com vigência aberta (`409 ALREADY_SUBSCRIBED`). CTA: **Gerenciar cartão** / trocar plano.
2. `GET /v1/billing/me` passa a alimentar a UI: `upgradeQuotes`, `scheduledDowngrade`, `canScheduleDowngrade`, `savedCard` / `savedCards`.
3. Upgrade: mostrar o valor de hoje (prorrata) **antes** de confirmar — copy `hoje R$ amount (crédito R$ credit) · depois R$ recurring/mês`. Checkout continua `POST /v1/billing/checkout`.
4. Downgrade no meio da vigência paga: **agendar** (`POST /v1/billing/schedule-downgrade`), não cobrar agora. Banner “muda em {at}”. Checkout no meio do período → `409 PLAN_DOWNGRADE_LOCKED` com o mesmo CTA.
5. Cartões: `GET/POST /v1/billing/cards`, `POST …/{id}/default` (feedback “assinatura atualizada”), `DELETE …/{id}`. Lista até 5. UI `**** {last4}` (+ brand). PAN só em trânsito.
6. PIX hosted permanece; copy deixa claro que **cada renovação exige um novo PIX**. Cartão é a renovação automática.
7. Responsável completo ainda é exigido para cartão (e para salvar cartão).
8. `gateway.checkoutMode` Asaas = `inline` (cartão no painel) + PIX `hosted`. Stub continua `immediate`.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Re-checkout do mesmo plano ativo | Cobrança duplicada |
| Downgrade imediato no período pago | Já rejeitado no ADR-012 |
| Esconder cartões salvos e só mandar PAN de novo | Pior UX; a API já tokeniza |

## Consequências

- `packages/shared`: códigos `ALREADY_SUBSCRIBED` / `CREDIT_CARD_REQUIRED`, tipos de quote/cartão, `SAVED_CARDS_MAX`.
- Specs de billing (endpoints, fatias 10/12, schema, pricing, segurança) acompanham esta fatia.
