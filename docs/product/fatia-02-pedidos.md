# Fatia 2 — Pedidos (Kanban / KDS)

Fila do bar na tela. O dono (depois o garçom) vê os pedidos em colunas de status. **Ainda sem claim, PIN ou pedido pelo cliente no `/{slug}`.**

## Inclui

- Board Kanban em `/painel/pedidos` — **entrada padrão do painel** após o login (`/painel` redireciona para cá). Perfil **Painel** (cozinha/bar) usa a mesma rota, só com as categorias do cadastro ([fatia 14](fatia-14-kanban-painel.md)).
- Abas visíveis no topo: Pedidos | Mesas | Configurações (plano Cardápio: só Configurações)
- Pedido de **balcão** na comanda da mesa (`/garcom`; preço snapshot no servidor)
- Mudança de status: `pending` → `accepted` → `preparing` → `delivered` (e `cancelled`)
- API `GET/POST /v1/owner/orders` e `PATCH /v1/owner/orders/{id}`
- Seed com pedidos demo no Bar do Tião

O cardápio público `/{slug}` **não** tem pedidos — só o painel autenticado.

## Não inclui

- Pedido pelo QR / slug público (continua read-only)
- Claim do garçom, PIN, cookie guest
- Mesas como entidade (fatia 3)
- SSE / som de novo pedido (poll curto no board)
- Impressora térmica

## Por que Kanban

Uma lista única esconde o gargalo. Colunas = estados da cozinha/bar: o time vê o que acabou de chegar, o que está no fogo e o que já saiu. No celular o board rola na horizontal.

Ver [ADR-005](../decisions/ADR-005-kanban-pedidos.md).

## Colunas

| Coluna | Status | Ação típica |
|--------|--------|-------------|
| Novos | `pending` | Aceitar |
| Aceitos | `accepted` | Mandar preparar |
| Preparando | `preparing` | Marcar entregue |
| Entregues | `delivered` | Arquivo do turno |

Cancelados saem do board (`cancelled`).

## Card

- Rótulo da mesa (`Mesa 4`, `Balcão`)
- Tempo desde a criação
- Itens (qty × nome) e total
- Nota do pedido, se houver

Toque no card expande os itens. Botões avançam o status (mais confiável no celular que arrastar).

## Pedido de balcão

O Kanban **não** lança pedido — só avança status. Staff abre a mesa em `/garcom`, escolhe a comanda e inclui itens no dialog (categorias → itens). `source = counter` com `tab_id` da pessoa. [ADR-022](../decisions/ADR-022-pedido-garcom-na-comanda.md).
