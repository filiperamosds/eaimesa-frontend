# ADR-025: Responsável do bar + painel em Operação / Configurações

**Status:** Aceito  
**Data:** 2026-08-24  
**Backend:** eaimesa-backend (já implementado)

## Contexto

O dono misturava operação (fila, mesas) com cadastro (cardápio, equipe, pagador). O checkout Asaas pedia pagador a cada cobrança. O backend passou a guardar `venue.representative` e a reutilizar no checkout se o front omitir `payer`.

## Decisão (front)

- Nav dono (Auto atendimento): **Pedidos | Mesas | Configurações**
- Plano Cardápio: só **Configurações** (sem Pedidos/Mesas)
- Configurações: Cardápio, Meu bar, Equipe, Responsável, Pagamento
- Rotas: `/painel/configuracoes/*`; `/painel/mesas` operacional; `/painel/pagamento` checkout
- Redirects: `/painel/cardapio` → configuracoes/cardapio; `/painel/bar/*` → equivalentes
- Responsável: `PATCH /v1/owner/venue` `{ representative }`; pagamento pré-preenche e omite `payer` se inalterado
- Asaas sem responsável completo → CTA antes do 400 `PAYER_REQUIRED`

## Consequências

- Cardápio deixa de competir com Pedidos/Mesas na nav principal
- Mesas voltaram ao operacional do dono (`/painel/mesas`, CRUD `/v1/owner/tables`)
- Stub local continua sem exigir pagador
