# ADR-023: Garçom abre comanda e vê o PIN da mesa

**Status:** Aceito  
**Data:** 2026-08-23

## Contexto

O cliente abre a comanda no celular (QR + nome/telefone). No salão o garçom também anota pedido na hora: precisa **abrir a conta da pessoa** sem esperar o scan e **ler o PIN** para quem chega depois.

O PIN nascia só no primeiro redeem. O garçom não via o código. Pedido de balcão sem `tab_id` ia para o Kanban e sumia da mesa.

## Decisão

- `POST /v1/staff/tables/{tableId}/tabs` `{ name, phone }` — mesmo contrato do guest. Cria `TableSession` + PIN se a mesa ainda não tiver ocupação.
- PIN visível no staff: `pinDisplay` em `GET /v1/staff/tables`, `GET .../tabs` e `POST .../claims`.
- Primeiro claim **já abre** a sessão e gera o PIN (não espera o redeem). O cliente ainda precisa do QR ou do PIN para pedir pelo celular.
- Pedido do garçom grava `tab_id` ([ADR-022](ADR-022-pedido-garcom-na-comanda.md)). A mesa lista pedidos da comanda e `unassignedOrders` se `tab_id` vier nulo.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Só o cliente abre comanda | Garçom não consegue lançar na conta da pessoa se o celular falhou |
| PIN só no redeem | Garçom não tem o que ditar para a mesa |
| Path `/v1/staff/pins` | O PIN é da sessão da mesa, não um recurso novo |

## Consequências

- QR e PIN passam a existir juntos assim que o garçom toca “Novo QR” ou “Abrir comanda”.
- Guest redeem numa mesa que já tem sessão reusa o PIN (`plainPin()`). `POST /v1/guest/tabs` com o mesmo telefone **desta** sessão entra na comanda que o garçom abriu (não dá 409).
- Laravel: [backend-staff-order-tab.md](../api/backend-staff-order-tab.md).
