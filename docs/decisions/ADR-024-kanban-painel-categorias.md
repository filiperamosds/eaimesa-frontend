# ADR-024: Perfil Painel (Kanban por categoria)

**Status:** Aceito  
**Data:** 2026-08-24

## Contexto

O dono vê o Kanban completo. Cozinha e bar precisam de **monitores separados**: o pedido de um prato não deve ocupar a tela das bebidas. Sem um terceiro app — o front continua único.

## Decisão

- Novo `venue_members.role`: `panel` (UI: **Painel**). JWT continua `role: staff`. O perfil vem em `member.role`, como caixa.
- Login do Painel abre **somente** `/painel/pedidos` (Kanban). Sem cardápio, Estabelecimento, `/garcom` ou close de comanda.
- No cadastro, o dono marca **uma ou mais categorias** do cardápio. Aquela sessão só recebe itens dessas categorias.
- Um bar típico cria dois usuários Painel: “Cozinha” (Pratos, Porções) e “Bar” (Bebidas).
- Status do pedido **continua no pedido inteiro**. A estação vê só os itens dela; avançar o status vale para o pedido. Pedido misto aparece nos dois monitores até o ciclo terminar.
- `GET /v1/staff/orders` para `member.role=panel` filtra no servidor. Itens levam `categoryId` (snapshot na criação).
- Painel **não** lança pedido, **não** gera claim, **não** fecha comanda/mesa (`PANEL_FORBIDDEN`).

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| JWT `role: panel` | Middleware `venue.actor` já trata `staff` |
| App `/kds` separado | Front único; reusa `/painel/pedidos` |
| Tipo cozinha/bar no item | O dono já agrupa o cardápio em categorias |
| Status por item | Mudança grande; o pedido do salão continua um só |

## Consequências

- Equipe: `role` + `categoryIds` no POST/PATCH `/v1/owner/staff`. Painel pode mandar `printViaGroups` ([ADR-035](ADR-035-grupos-impressao.md)).
- Auth: `redirectPath` `/painel/pedidos`; `member.categoryIds` no `/v1/auth/me`.
- Limite de 5 ativos **inclui** Painel.
- Brief Laravel: [backend-kanban-painel.md](../api/backend-kanban-painel.md).
