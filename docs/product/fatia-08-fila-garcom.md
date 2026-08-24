# Fatia 8 — Fila do garçom

O dono já tem o Kanban em `/painel/pedidos`. O **garçom** precisa da mesma fila no celular: aceitar, preparar, entregar — sem entrar no painel do dono.

## Inclui

- App `/garcom/pedidos` — Kanban (Mesas | Pedidos)
- `GET /v1/staff/orders` — fila 48h (dono ou garçom)
- `PATCH /v1/staff/orders/{id}` — `{ status }`
- Poll curto (já existe no board). Sem SSE.

Lançar itens **não** é nesta tela. O garçom abre a mesa em `/garcom`, entra na comanda e usa **Adicionar pedido** (`POST /v1/staff/orders` com `tabId`, cardápio em `GET /v1/staff/catalog`). [ADR-022](../decisions/ADR-022-pedido-garcom-na-comanda.md). Perfil **Painel** não usa `/garcom/pedidos`: cai em `/painel/pedidos` com a fila filtrada por categoria ([fatia 14](fatia-14-kanban-painel.md)).

## Não inclui

- SSE / som
- Impressora
- Travamento da comanda (`lock`)
- Pagamento
- Lançar pedido no Kanban (comanda em `/garcom`)

## Fluxo

1. Login garçom → `/garcom` (mesas) ou **Pedidos**.
2. Pedido do cardápio (guest) ou lançado na comanda cai em **Novos** (`pending`).
3. Garçom Aceitar → Preparar → Entregar.
4. Para incluir itens: **Mesas** → comanda aberta → dialog **Adicionar pedido** (categorias, depois itens).

O Kanban do dono (`/v1/owner/orders`) continua. A regra de status é a mesma.

Ver [ADR-011](../decisions/ADR-011-fila-garcom.md).
