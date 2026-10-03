# ADR-004: Slug amigável na URL do cardápio

**Status:** Aceito  
**Data:** 2026-08-17

## Contexto

A visão inicial usava `venue_public_id` opaco na URL (`/d1de031d33`). Para o cardápio público isso é ruim de lembrar, de imprimir e de divulgar (Instagram, WhatsApp). O dono precisa de uma URL **configurável**.

## Decisão

- URL pública do cardápio: `/{slug}` (ex. `/seu-estabelecimento`)
- `slug` é único, **gerado a partir do nome no cadastro**. Depois disso o dono **não** altera (403 `SLUG_LOCKED`). Troca só no console (`PATCH /v1/platform/venues/{id}`).
- `public_id` opaco **permanece** na tabela `venues` como identificador estável (claims/QR futuros podem usá-lo se o slug mudar)
- Sem domínio customizado no MVP (`bar.com.br` próprio continua fora de escopo)

## Alternativas

| Opção | Por que não agora |
|-------|-------------------|
| Só `public_id` opaco | Ruim para marketing do bar |
| Subdomínio `seu-estabelecimento.eaimesa.com.br` | TLS/wildcard e cookie mais caros |
| `/c/seu-estabelecimento` prefixado | Usuário pediu path na raiz |

## Consequências

- Rotas de produto são slugs reservados (não podem ser nome de bar).
- Troca de slug: só operador em `/admin/bares`. URL antiga 404 até existir redirect.
- Cardápio em `/{slug}` continua **não autorizando pedido**.
