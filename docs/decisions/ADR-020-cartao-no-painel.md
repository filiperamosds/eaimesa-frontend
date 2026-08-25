# ADR-020: Cartão digitado no painel e enviado ao Asaas

**Status:** Aceito  
**Data:** 2026-08-22  
**Supersede:** o item “nunca enviar PAN” e o redirect de cartão em [ADR-018](ADR-018-payment-gateway-asaas.md)

## Contexto

O dono informa o cartão em `/painel/bar/plano`. O checkout hosted do Asaas pedia o cartão na página do provedor. O produto passou a capturar o cartão **no próprio painel** e encaminhar à API Asaas.

O Asaas **não** oferece tokenização no browser. Se o PAN transita pelo Laravel, o escopo PCI é SAQ-D.

## Decisão

1. `method: card`: o front envia `{ plan, method, payer, creditCard }` em `POST /v1/billing/checkout`. `creditCard` = `holderName`, `number`, `expiryMonth`, `expiryYear`, `ccv`. `payer` inclui CEP e número do endereço (exigência Asaas do titular).
2. Laravel **não persiste** PAN/CVV. Encaminha em HTTPS ao Asaas (`POST /v3/payments` com `creditCard` + `creditCardHolderInfo` + `remoteIp` do cliente). Resposta: `creditCardToken`, last4, bandeira.
3. Persistimos em `venue_billing`: `credit_card_token` (encrypted), `card_last4`, `card_brand`, `customer_id`. Token serve para cobranças seguintes sem reenviar o número.
4. `method: pix`: continua checkout hosted (`checkoutUrl` + redirect). Sem PAN.
5. Stub: aceita `creditCard` no body, **ignora**, responde `success` após ~2s. Não grava cartão.
6. Nunca logar PAN, CVV nem token. A resposta JSON do checkout **não** devolve o token.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Só checkout hosted para cartão | O dono digitava na nossa tela e o POST não levava o número |
| Tokenizar só no browser | Asaas não tem SDK de tokenização client-side |
| Guardar PAN no MySQL | PCI; proibido mesmo cifrado sem cofre PCI |

## Consequências

- PCI SAQ-D enquanto o PAN passar pelo backend.
- HTTPS obrigatório em produção (Asaas bloqueia cartão sem SSL).
- Tokenização em produção exige liberação do gerente Asaas.
