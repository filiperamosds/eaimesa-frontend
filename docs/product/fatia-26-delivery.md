# Fatia 26 — Delivery

Pedido remoto no **mesmo** frontend. `/{slug}` continua só mesa (PIN/comanda). Delivery mora em `/{slug}/delivery`. Sem conta, sem Google, pagamento na entrega.

## Inclui

- Módulo `delivery` (opt-in, default off). No plano Auto atendimento (ou quem já tem `guest_ordering`).
- Config: `feeCents` (0–50000), `etaMinutes` (null ou 10–180), `printFullReceipt` (bool, default off). UI: Configurações → Delivery.
- Cardápio + wizard de checkout em `/{slug}/delivery`: layout de delivery (cards com foto, cesta no desktop, barra no celular); wizard itens → WhatsApp → nome+CPF se novo → endereços (CEP/ViaCEP, vários) → Pix ou dinheiro na porta.
- Acompanhamento `/{slug}/delivery/p/{token}` (URL secreta, 32 hex). Export estático: mesma trick do claim (`/c/{token}`).
- `POST .../delivery/lookup|customers|addresses|orders` — sem cookie; `Idempotency-Key` só no pedido.
- Kanban: selo Delivery, filtro Todos | Salão | Delivery, botão **Saiu** (em vez de Entregar) quando `preparing` + `source=delivery`. Cozinha `delivered` = saiu da casa, não chegou no cliente.
- Com `printFullReceipt`, a térmica do Kanban imprime as vias dos itens e, em seguida, a nota completa (endereço, WhatsApp, total sem taxa de serviço) para pregar no pedido.

## Não inclui

- Login do cliente / Google
- Pagamento online
- Mapa, app de entregador, iFood
- Segundo frontend

## Fluxo cliente

1. `/{slug}` (se o módulo estiver ligado) ou link direto `/{slug}/delivery`.
2. Monta a cesta. Wizard: **itens** → telefone; se novo, nome e CPF; escolhe ou cadastra endereço (CEP primeiro, ViaCEP); por último a forma de pagamento na entrega.
3. POST → `pending` no Kanban. Resposta traz `trackPath`.
4. Poll do GET pelo token: Recebido → Preparando → Saiu para entrega.

## Regras

- Módulo off / fora do plano / assinatura suspensa → POST 403; o GET do cardápio público manda `venue.delivery.enabled=false`.
- Token inválido → 404. Hash SHA-256 no banco; o token só aparece no POST.
- Rate limit POST: 20 / 10 min por IP+venue.
- Cliente identificado por **telefone + venue** (não é login). Até 10 endereços. CPF 11 dígitos, mascarado na API.
- `table_label = Delivery`, sem `table_id` / `tab_id`.
- Não exige caixa aberto (pedido remoto). Se houver caixa, o pedido ainda vincula à sessão aberta.
- `/{slug}` guest **não muda** (ADR-010).

Ver [ADR-044](../decisions/ADR-044-delivery-sem-conta.md).
