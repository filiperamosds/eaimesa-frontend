# Fatia 14 — Painel Kanban (cozinha / bar)

Monitor na parede da cozinha ou do bar: só a fila, só os itens daquela estação.

## Inclui

- Perfil **Painel** na equipe (`member.role = panel`)
- Cadastro: o dono marca **uma ou mais categorias** do cardápio para aquele usuário
- Login → `/painel/pedidos` (Kanban cheio de tela). Sem mesas, cardápio, Estabelecimento
- Pedido com item da categoria chega nesse Kanban; o outro monitor não vê esse item
- `GET /v1/staff/orders` filtrado; itens com `categoryId`
- UI kiosk: Sair. Sem “Mesas e comandas”

## Não inclui

- Status por item (o pedido inteiro avança junto)
- SSE / som
- Agente local de impressora (via USB no Kanban: [ADR-029](../decisions/ADR-029-cupom-escpos-usb.md))
- App `/kds` separado

## Fluxo

1. Dono cadastra “Cozinha” (perfil Painel + categorias de comida) e “Bar” (bebidas) em **Configurações → Equipe**.
2. Tablet da cozinha entra com o login da Cozinha → só o Kanban da comida.
3. Guest ou garçom lança um pedido misto (porção + cerveja): cozinha vê a porção; bar vê a cerveja.
4. Cada estação avança o status do **pedido** (ciclo compartilhado).

Ver [ADR-024](../decisions/ADR-024-kanban-painel-categorias.md). O Kanban do dono (`GET /v1/owner/orders`) continua sem filtro.
