# ADR-025: Responsável do estabelecimento + painel em Operação / Configurações

**Status:** Aceito  
**Data:** 2026-08-24  
**Backend:** eaimesa-backend (já implementado)

## Contexto

O dono misturava operação (fila, mesas) com cadastro (cardápio, equipe, pagador). O checkout Asaas pedia pagador a cada cobrança. O backend passou a guardar `venue.representative` e a reutilizar no checkout se o front omitir `payer`.

## Decisão (front)

- Nav dono (Auto atendimento): **Pedidos | Configurações**
- Plano Cardápio: **Chamados | Configurações**
- Configurações: Cardápio, Estabelecimento, **Mesas**, **Chamada**, Equipe (Auto), Responsável, Pagamento
- Rotas: `/painel/configuracoes/*`; `/painel/chamados` (fila); `/painel/mesas` → redirect para `configuracoes/mesas`; `/painel/pagamento` checkout
- Redirects: `/painel/cardapio` → configuracoes/cardapio; `/painel/bar/*` → equivalentes
- Responsável: `PATCH /v1/owner/venue` `{ representative }`; pagamento pré-preenche e omite `payer` se inalterado
- Cadastro (`POST /v1/auth/register`) já envia `representative.name` + `representative.cpfCnpj` (CPF). O restante do responsável continua nesta tela.
- Asaas sem responsável completo → CTA antes do 400 `PAYER_REQUIRED`

## Consequências

- Operação Cardápio = Chamados; Auto = Pedidos. Cadastro do salão (mesas + QR) fica em Configurações nos dois planos
- Stub local continua sem exigir pagador
