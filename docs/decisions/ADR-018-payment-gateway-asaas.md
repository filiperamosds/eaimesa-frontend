# ADR-018: Checkout hospedado (Asaas) no painel

**Status:** Aceito  
**Data:** 2026-08-21

## Contexto

A fatia 10 vendeu planos com checkout **stub** e UI de cartão/PIX que não envia PAN. O backend passou a expor `gateway.checkoutMode` (`immediate` | `hosted`). No Asaas o cartão fica na página do provedor; confirmar no `successUrl` seria mentir o status.

## Decisão

1. O front lê `gateway` em `GET /v1/billing/plans` e `GET /v1/billing/me`.
2. `immediate`: mantém o fluxo da fatia 10 (`{ plan, method }`, espera `success`). Payer opcional.
3. `hosted`: tira PAN/validade/CVV e “copia PIX”. Pede nome + CPF/CNPJ; e-mail (default da conta) e telefone opcionais. `POST /v1/billing/checkout` com `payer`. Redirect se `pending` + `checkoutUrl`. O backend cria checkout Asaas **recorrente** (`MONTHLY`): o cartão é digitado e **salvo no Asaas**; o webhook traz `subscription` e gravamos `subscription_id` em `venue_billing`.
4. `?checkout=ok|cancel|expired` só informa. Pago = `venue.subscriptionStatus === 'active'` via poll (~3s, até ~2 min).
5. `available === false`: aviso, sem POST. `pendingCheckout.url`: “continuar pagamento”.
6. Landing, `/preco` e `/cadastro` não pedem pagador.
7. Nunca enviar PAN, CVV ou token de cartão.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Marcar pago no `?checkout=ok` | PIX/webhook pode atrasar; o Asaas avisa que o callback não confirma |
| Coletar cartão no Next e tokenizar (`creditCardToken`) | Asaas só tokeniza no servidor (SAQ-D). Sem SDK de browser. Recorrência hosted já guarda o cartão no Asaas |
| Pedir CPF no cadastro | Trial continua sem pagador |

## Consequências

- `packages/shared`: `payerSchema`, códigos `PAYER_REQUIRED` / `PAYMENT_UNAVAILABLE` / `PAYMENT_GATEWAY_ERROR`
- `/painel/pagamento` e `/painel/bar` compartilham o mesmo painel
