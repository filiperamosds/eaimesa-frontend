# Documentação EaiMesa

Índice. Fatia atual: **Equipe de operadores SaaS**; fatias 1–17 no repo.

1. [Fatia 1 — Cardápio](product/fatia-01-cardapio.md)
1b. [Fatia 2 — Pedidos](product/fatia-02-pedidos.md) — Kanban / KDS no painel
1c. [Fatia 3 — Mesas](product/fatia-03-mesas.md) — salão cadastrado, pedido escolhe mesa
1d. [Fatia 4 — Claim garçom](product/fatia-04-claim-garcom.md) — equipe, `/garcom`, redeem + PIN
1e. [Fatia 5 — PIN join](product/fatia-05-pin-join.md) — outro celular entra na mesa
1f. [Fatia 6 — Comandas individuais](product/fatia-06-comandas-individuais.md) — nome + telefone, várias contas por mesa
1g. [Fatia 7 — Pedido guest](product/fatia-07-pedido-guest.md) — carrinho no `/{slug}` na comanda pessoal
1h. [Fatia 8 — Fila do garçom](product/fatia-08-fila-garcom.md) — Kanban em `/garcom/pedidos`
1i. [Fatia 9 — Parcial do cliente](product/fatia-09-parcial-guest.md) — comanda no celular: itens, status, total
1j. [Fatia 10 — Planos](product/fatia-10-planos.md) — Cardápio vs Auto atendimento, trial, checkout stub
1k. [Fatia 11 — Console SaaS](product/fatia-11-console-saas.md) — login da plataforma, dashboard, estabelecimentos (expiração + suspender), catálogo (criar plano + promo)
1l. [Fatia 12 — Pagamento Asaas](product/fatia-12-pagamento-asaas.md) — cartão no painel + token; PIX hosted; stub local
1m. [Fatia 13 — Log viewer](product/fatia-13-log-viewer.md) — `/admin/logs`, tail Laravel
1n. [Fatia 14 — Painel Kanban](product/fatia-14-kanban-painel.md) — perfil Painel, categorias por monitor
1o. [Fatia 15 — Chamar garçom](product/fatia-15-chamar-garcom-cardapio.md) — QR `?mesa=` + presença + fila (plano Cardápio)
1p. [Fatia 16 — Eventos de integração](product/fatia-16-integration-events.md) — `/admin/integracoes`, webhooks Asaas
1q. [Fatia 17 — Equipe de operadores](product/fatia-17-platform-equipe.md) — `/admin/equipe`, `GET/POST /v1/platform/users`
2. [Visão do produto](product/visao.md) — o quê, para quem, o que fica de fora
3. [Fluxos](product/fluxos.md) — publicar cardápio; guest pede na mesa
4. [Pricing](product/pricing.md) — Cardápio e Auto atendimento
5. [Arquitetura](architecture/overview.md) — dois repos (Laravel + Next), um front
6. [Sessão claim + PIN](architecture/sessao-claim-pin.md) — claim, PIN join, cookie guest
7. [Segurança](security/modelo.md) — tenancy, cookies, ameaças
8. [Modelo de dados](data/schema.md) — entidades fatia 1–17 + planejadas
9. [API](api/endpoints.md) — REST fatia 1–17 + contrato futuro
9b. [Backend — caixa / close](api/backend-caixa-close.md) — o que o Laravel precisa alterar (`staffCanCloseTabs`, `cashier`)
9c. [Backend — pedido na comanda](api/backend-staff-order-tab.md) — `tabId`, PIN no staff, `POST .../tabs`
9d. [Backend — Kanban Painel](api/backend-kanban-painel.md) — `role=panel`, `categoryIds`, filtro da fila
9e. [Backend — chamar garçom](api/backend-waiter-call.md) — presença `?mesa=`, cookie, fila (ADR-026)
10. [Dev setup](ops/dev-setup.md) — Next local, seed, **GitHub Actions → Hostinger (`develop` / `main`)**
11. [ADRs](decisions/ADR-001-stack.md) — … **chamar garçom QR mesa (ADR-026)**, **eventos de integração (ADR-027)**

## Cursor

Regra sempre ativa: `.cursor/rules/docs-sync.mdc` — mudança de produto/API/dados **atualiza estes specs na mesma alteração**.

Canvases `.canvas.tsx` do IDE **não** fazem parte deste repositório. O conteúdo relevante está em `docs/product/` e `docs/architecture/`.
