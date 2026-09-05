# Visão do produto

## Problema

Bares e restaurantes pequenos usam tablets fixos na mesa (caro, sujo, gargalo) ou garçom anotando no papel (erro, fila). Cardápio QR “solto” permite pedido remoto se o link autorizar pedir.

## Proposta EaiMesa

Plataforma **SaaS multi-tenant**: cada estabelecimento paga aluguel mensal; o consumidor **não paga** a plataforma e **não instala app**.

| Peça | Função |
|------|--------|
| **Slug da casa** (`/seu-estabelecimento`) | URL pública configurável. Cardápio. **Não autoriza pedir.** |
| **Claim do garçom** (`/{slug}/c/{token}`) | Secret de uso único, TTL curto. Abre a **mesa** (PIN do grupo). |
| **PIN da mesa** | Outros aparelhos entram na ocupação (`/{slug}/entrar`). |
| **Comanda pessoal** | Nome + telefone; várias por mesa. |
| **Cookie guest** (`eaimesa_guest`) | Sessão httpOnly após redeem/PIN; liga à comanda depois do cadastro. |
| **Cookie dono** (`eaimesa_owner`) | Sessão do estabelecimento no painel. |
| **Cookie platform** (`eaimesa_platform`) | Sessão do operador no console `/admin`. |

## Superfícies

Tudo no **mesmo** frontend (repo **eaimesa-frontend**). Ver [ADR-003](../decisions/ADR-003-frontend-unico.md), [fatia 1](fatia-01-cardapio.md) e [fatia 2](fatia-02-pedidos.md).

| Superfície | Rota | Usuário | Fatia 10 | MVP completo |
|------------|------|---------|----------|--------------|
| **Landing** | `/` | Visitante B2B | Cards do catálogo (de/por se houver promo) | Sim |
| **Auth estabelecimento** | `/cadastro`, `/login` | Dono / garçom | Trial 7 dias no plano escolhido | Sim |
| **Painel** | `/painel/*` | Dono | Nav: Pedidos, Mesas, Configurações (plano Cardápio: Mesas + Configurações). Logo volta à home do papel (pedidos ou cardápio), não à landing. | — |
| **Pagamento** | `/painel/pagamento` | Dono | Destaque no fim do trial; checkout stub ou Asaas; pagador = responsável | Conta da mesa |
| **Garçom / caixa** | `/garcom` | Staff (`member.role` staff ou cashier) | Só Auto atendimento | — |
| **Painel (KDS)** | `/painel/pedidos` | Staff (`member.role` panel) | Só Auto atendimento; categorias no cadastro | — |
| **Cardápio público** | `/{slug}` | Cliente | Sempre leitura; pedido só Auto atendimento | — |
| **Platform** | `/admin` | Operador EaiMesa | Console: vendas, estabelecimentos, equipe, planos, logs, integrações | SSO/2FA |

## Personas

- **Dono** — 1 estabelecimento, ~10 mesas, quer menos hardware e pedido confiável. Publica o cardápio, vê a fila, cadastra o salão e a equipe.
- **Garçom** — gera QR na mesa; vê parciais; avança a fila. Encerra comanda/mesa só se o dono permitir.
- **Caixa** — mesma tela `/garcom`; sempre pode fechar comanda e mesa.
- **Painel** — login no monitor da cozinha ou do bar; só o Kanban das categorias que o dono marcou.
- **Cliente / mesa** — lê o cardápio, junta-se com o PIN e pede. Não cria conta.
- **Operador EaiMesa** — entra em `/admin` (`platform_users`, cookie distinto). Vê estabelecimentos, vendas da assinatura, catálogo, equipe de operadores, logs da API e webhooks. Não atende o salão nem edita o cardápio de um estabelecimento.

## Fatia atual vs MVP

Implementação **agora**: [fatia 24 — ofertas e happy hour](fatia-24-ofertas-happy-hour.md).

### MVP (quando as fatias somarem)

- Signup B2B: e-mail, senha, nome do estabelecimento, nome e CPF do responsável
- Planos com `kind` Cardápio ou Auto atendimento (SKUs extras no console); trial 7 dias
- Cardápio CRUD (texto, preço no servidor, foto no disco, oferta e happy hour)
- Auto atendimento: mesas + claim + PIN + pedido guest + fila staff
- Estoque: insumos, receita no item, alerta ([fatia 21](fatia-21-estoque.md))
- Multi-tenant com `venue_id` em toda query
- Billing: trial/vigência/suspensão; catálogo no banco; cartão no painel (token Asaas) ou PIX hosted

### Fora do MVP

- Pagamento da conta no app / split
- CPF do consumidor para pedir
- Agente impressora térmica (cozinha em processo local). Via USB no Kanban e cupom de conferência: [ADR-029](../decisions/ADR-029-cupom-escpos-usb.md). Cupom a partir do celular: [ADR-041](../decisions/ADR-041-fila-cupom-kanban.md). Vias por grupo: [ADR-035](../decisions/ADR-035-grupos-impressao.md).
- Delivery, iFood, WhatsApp bot
- App nativo, domínio customizado por estabelecimento
- NFC-e

## Métricas de sucesso (piloto)

- Pedido remoto (só slug da casa) → **403** (quando houver pedido)
- Dois estabelecimentos no mesmo DB → **isolamento** (A não lê B)
- `/{slug}` de um estabelecimento não lista itens de outro
- Sábado com rede ruim → fila staff funciona; claim expirado não abre tab

## Naming / URLs

- Marca: **EaiMesa**
- Domínio alvo: `eaimesa.com.br`
- Path do cardápio: `/{slug}` (ex. `/seu-estabelecimento`) — [ADR-004](../decisions/ADR-004-slug-publico.md)
- Path de claim: `/{slug}/c/{claimToken}` (redirect após redeem)
- Path de PIN join: `/{slug}/entrar`
- `venue.public_id` opaco existe no banco; **não** é a URL do cardápio na fatia 1
