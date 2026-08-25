# ADR-022: Pedido do garçom na comanda, não no Kanban

**Status:** Aceito  
**Data:** 2026-08-23

## Contexto

O Kanban misturava fila (aceitar/preparar/entregar) com **lançar itens**. No salão o garçom já está na mesa: abre as contas e precisa colocar o pedido na **comanda da pessoa**. Um “Novo pedido” no board pedia só a mesa — sem `tab_id` — e a parcial da pessoa ficava vazia.

## Decisão

- Kanban (`/painel/pedidos` e `/garcom/pedidos`) **não** cria pedido. Só avança status.
- Lançar: `/garcom` → mesa ocupada → dialog das comandas → **Adicionar pedido** (outro dialog).
- UI do cardápio no dialog: categorias primeiro (grade); depois navbar de categorias + itens com qty +/−.
- `POST /v1/staff/orders` (e o mesmo body em `/v1/owner/orders`) aceita `tabId`. Comanda `open` do venue; mesa vem da tab. `source` continua `counter`. `tab_id` grava na parcial do guest.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Manter “Novo pedido” no Kanban | Lança fora da comanda; o garçom não está na fila quando anota o pedido |
| Path novo `/v1/staff/tabs/{id}/orders` | Contrato já tem POST de orders; só estende o body |
| `source = guest` no lançamento do staff | Guest é o pedido pelo celular da pessoa |

## Consequências

- Sem `tabId`, o POST ainda aceita mesa/rótulo ( balcão legado ). O front **não** usa esse caminho.
- Cliente vê na própria parcial o que o garçom lançou (`GET /v1/guest/orders` filtra por `tab_id`).
- Laravel: [backend-staff-order-tab.md](../api/backend-staff-order-tab.md).
