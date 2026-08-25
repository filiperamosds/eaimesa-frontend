# ADR-018: Checkout hospedado (Asaas) no painel

**Status:** Parcialmente supersedido por [ADR-020](ADR-020-cartao-no-painel.md) (cartão no painel). PIX hosted permanece.  
**Data:** 2026-08-21

## Contexto

A fatia 10 vendeu planos com checkout **stub**. O backend expõe `gateway.checkoutMode` (`immediate` | `hosted`). PIX usa a página do Asaas. Cartão no painel: [ADR-020](ADR-020-cartao-no-painel.md).

## Decisão

1. O front lê `gateway` em `GET /v1/billing/plans` e `GET /v1/billing/me`.
2. `immediate`: mantém o fluxo da fatia 10 (`{ plan, method }`, espera `success`). Payer opcional.
3. `hosted` **PIX**: tira “copia PIX”. Pede nome + CPF/CNPJ; e-mail e telefone opcionais. `POST /v1/billing/checkout` com `payer`. Redirect se `pending` + `checkoutUrl`.
3b. **Cartão no painel:** [ADR-020](ADR-020-cartao-no-painel.md). O POST leva `creditCard`; o Laravel encaminha ao Asaas e guarda o token.
4. `?checkout=ok|cancel|expired` só informa. Pago = `venue.subscriptionStatus === 'active'` via poll (~3s, até ~2 min).
5. `available === false`: aviso, sem POST. `pendingCheckout.url`: “continuar pagamento”.
6. Landing, `/preco` e `/cadastro` não pedem pagador.
7. PIX: nunca enviar PAN. Cartão: PAN só em trânsito (ADR-020); não persistir nem logar.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Marcar pago no `?checkout=ok` | PIX/webhook pode atrasar; o Asaas avisa que o callback não confirma |
| Coletar cartão no Next e tokenizar no browser | Asaas não tem SDK client-side |
| Pedir CPF no cadastro | Trial continua sem pagador |

## Consequências

- `packages/shared`: `payerSchema`, códigos `PAYER_REQUIRED` / `PAYMENT_UNAVAILABLE` / `PAYMENT_GATEWAY_ERROR`
- `/painel/bar/plano` (antes `/painel/pagamento`) e `/painel/bar` compartilham o mesmo hub
