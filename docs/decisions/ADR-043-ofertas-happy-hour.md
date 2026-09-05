# ADR-043: Oferta permanente e happy hour por dia

**Status:** Aceito  
**Data:** 2026-09-05  
**Depende de:** [ADR-004](ADR-004-slug-publico.md), [ADR-010](ADR-010-pedido-guest.md)

## Contexto

O cardápio público listava todas as categorias numa página com âncoras. O dono queria filtrar por categoria, uma aba de ofertas e preços de happy hour diferentes por dia (qua/qui vs sex/sáb vs domingo).

## Decisão

- `offer_price_cents` no item: promoção permanente, abaixo do preço de lista.
- `happy_hour_windows`: `days` JSON (0=Dom…6=Sáb), `starts_at` / `ends_at`, itens com `price_cents`.
- Preço efetivo (`CatalogPricing`): happy hour ativo (o menor, se várias janelas) se menor que a lista; senão oferta se menor que a lista; senão lista. Relógio `America/Sao_Paulo`. Janela que cruza meia-noite (`starts > ends`) vale.
- Menu público devolve `priceCents` efetivo, `listPriceCents` e `promo`. Pedido snapshota o efetivo.
- UI pública: abas que filtram, não scroll âncora. **Ofertas** (`promo=offer`) e **Happy hour** (`promo=happy_hour`) são abas distintas; só aparecem se houver item naquele preço.
- PUT `/v1/owner/happy-hour` substitui todas as janelas do venue (máx. 12).

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Só “% off” no item | Happy hour precisa de horário e dia |
| Um horário só para a casa | Qua/qui ≠ sex/sáb ≠ domingo |
| Kanban = preço da promoção | O snapshot no pedido já congela o valor |

## Consequências

- Painel: oferta no dialog do item; happy hour abaixo do CRUD em Configurações → Cardápio.
- Status por estação (bar entrega o drink sem esperar o petisco) **não** entra aqui.
