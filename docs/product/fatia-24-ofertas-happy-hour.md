# Fatia 24 — Categorias, ofertas e happy hour

O cliente filtra o cardápio por categoria. Oferta permanente e happy hour por dia da semana baixam o preço na hora do pedido.

## Inclui

- Abas no `/{slug}` que **filtram** (Ofertas, Happy hour, categorias), não âncoras de scroll
- `catalog_items.offer_price_cents` — oferta permanente; entra na aba Ofertas (não mistura com happy hour)
- `happy_hour_windows` + `happy_hour_window_items` — faixas por dia (0=Dom…6=Sáb)
- Preço efetivo: happy hour ativo (menor) > oferta < lista > lista. Timezone `America/Sao_Paulo`
- Pedido guest/balcão snapshota o preço efetivo, não `price_cents` cru
- `GET`/`PUT /v1/owner/happy-hour`
- Menu público: `priceCents` efetivo + `listPriceCents` + `promo: 'offer'|'happy_hour'|null`
- Painel: preço de oferta no item; editor de happy hour em Configurações → Cardápio

## Não inclui

- Status do pedido por estação (bar vs cozinha) — o Kanban ainda avança o **pedido inteiro**
- Oferta com data de validade (só permanente ou janela de happy hour)

Ver [ADR-043](../decisions/ADR-043-ofertas-happy-hour.md).
