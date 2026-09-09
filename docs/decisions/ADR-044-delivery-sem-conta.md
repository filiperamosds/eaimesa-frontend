# ADR-044: Delivery sem conta no mesmo frontend

**Status:** Aceito  
**Data:** 2026-09-08  
**Depende de:** [ADR-003](ADR-003-frontend-unico.md), [ADR-004](ADR-004-slug-publico.md), [ADR-010](ADR-010-pedido-guest.md)

## Contexto

Estabelecimentos querem pedido para entrega. Um segundo app, login Google ou pagamento online atrasam o piloto. O `/{slug}` já é o fluxo de mesa (PIN/comanda) e não pode misturar sessão.

## Decisão

- Continua **um** Next. Delivery é `/{slug}/delivery`; acompanhamento `/{slug}/delivery/p/{token}`.
- Sem conta Google / senha. Cliente identificado por telefone no estabelecimento (nome, CPF, endereços).
- A URL do token (32 hex, hash SHA-256 no banco) é o segredo do acompanhamento.
- Checkout em wizard: itens → telefone → cadastro se novo → lista/CEP ViaCEP → pagamento na porta (`cash` | `pix`).
- Pagamento na porta: `cash` | `pix`. Sem PSP no pedido.
- Módulo `delivery`, default **off**. Taxa, ETA e nota completa para o entregador na config do módulo.
- No Kanban, `delivered` em delivery significa **saiu da cozinha**, não “chegou no cliente”. O botão vira **Saiu**.
- Export estático: a página é `/{slug}/delivery/p/`; o token vem de `window.location` (igual ao claim `/c/{token}`).

## Alternativas rejeitadas

| Opção | Por quê não |
|-------|-------------|
| Segundo frontend | ADR-003; dobraria deploy e auth |
| Google / conta do cliente | Fora do piloto; misturaria com `/login` da casa |
| Pedir delivery em `/{slug}` | Quebra o fluxo de mesa (comanda/PIN) |
| Pagamento online | Escopo de PSP + conciliação |
| Token na query `?t=` | Mais fácil de vazar em referrer; path opaco como o claim |

## Consequências

- Guest mesa (ADR-010) permanece exigindo cookie + comanda.
- Dono liga em Configurações → Delivery. CTA “Pedir delivery” só com módulo on.
- Relatórios filtram `source=delivery`.
