# API — REST

Base: `https://api.eaimesa.com.br/v1` (local: `http://localhost:8000/v1`).

Formato: JSON. Erros:

```json
{
  "error": {
    "code": "VENUE_NOT_FOUND",
    "message": "Este cardápio não existe."
  }
}
```

CORS: origin explícita do único front (`APP_URL`), `credentials: true`.

## Implementado (fatias 1–17)

### Saúde

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | — | Liveness (fora de `/v1`) |

### Auth estabelecimento (dono e garçom)

Cookie: `eaimesa_owner` (httpOnly, SameSite=Lax, Path=/). JWT inclui `role: owner | staff`. Garçom, caixa e painel compartilham JWT `staff`; o perfil está em `member.role` (`staff` | `cashier` | `panel`). Painel: `redirectPath` `/painel/pedidos` e `member.categoryIds`.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/auth/register` | — | Cria account + venue (role owner); Set-Cookie |
| POST | `/v1/auth/login` | — | E-mail/senha; owner ou staff; Set-Cookie + `redirectPath`. Staff inativo → 403 `STAFF_INACTIVE` (“Seu usuário está inativo.”) |
| POST | `/v1/auth/logout` | Cookie | Clear-Cookie |
| GET | `/v1/auth/me` | Cookie | `role` (`owner` \| `staff`), account, venue (`staffCanCloseTabs`, `requireShiftOnOpenCash`); `member` se staff (`id`, `name`, `role`: `staff` \| `cashier` \| `panel`, `categoryIds` se painel). Staff inativo → 403 `STAFF_INACTIVE` |

#### POST /v1/auth/register (body)

```json
{
  "email": "dono@bar.com",
  "password": "mínimo 8 chars",
  "venueName": "Seu Estabelecimento",
  "slug": "seu-estabelecimento",
  "plan": "auto_atendimento",
  "representative": {
    "name": "Maria Silva",
    "cpfCnpj": "12345678909"
  }
}
```

O front **não deixa editar** o slug: gera a partir de `venueName` (`Seu Estabelecimento` → `seu-estabelecimento`). Se o caminho já existir (ou for reservado), usa `-2`, `-3`… (`seu-estabelecimento-2`). Confere com `GET /v1/public/venues/{slug}` (404 = livre). `representative.name` + `representative.cpfCnpj` (CPF, 11 dígitos) entram em `venue.representative`; e-mail, telefone, CEP e número continuam em Configurações → Responsável. Laravel persiste o par no register.

#### POST /v1/auth/login (body)

```json
{ "email": "dono@bar.com", "password": "..." }
```

### Público — cardápio

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/v1/public/venues/{slug}` | — | Venue + categorias ativas + itens ativos |
| POST | `/v1/public/venues/{slug}/presence` | — | Body `{ mesa }` (menuCode). Cookie `eaimesa_presence` |
| GET | `/v1/public/presence` | Cookie presença | Sessão atual ou 401 |
| POST | `/v1/public/waiter-calls` | Cookie presença | Abre chamado na mesa |

Itens inativos e categorias inativas **não** entram na resposta pública. Venue `suspended`: ainda retorna o cardápio com `subscriptionStatus` para o front avisar. `plan` e `planKind` entram no payload (`kind=cardapio` não oferece PIN/pedido). No front, plano Cardápio esconde “Entrar para pedir” e a faixa de PIN; `/{slug}/entrar` redireciona ao cardápio. Payload pode incluir `waiterCallEnabled` / `waiterCallTtlMinutes` ([ADR-026](../decisions/ADR-026-chamar-garcom-qr-mesa.md)); detalhe da presença: [backend-waiter-call.md](backend-waiter-call.md). Dono: `GET /v1/owner/waiter-calls?status=open`, `PATCH …/{id}` `{ status: "acked" }` — UI `/painel/chamados`.

### Billing (fatias 10 e 12 + ADR-028)

Driver em `PAYMENT_GATEWAY`: `stub` (local, `success` após ~2s) ou `asaas`. **Cartão** é digitado no painel e o Laravel encaminha ao Asaas ([ADR-020](../decisions/ADR-020-cartao-no-painel.md), [ADR-028](../decisions/ADR-028-assinatura-recorrente-planos.md)). **PIX** usa checkout hospedado. Confirmação PIX só no webhook. Landing, `/preco` e `/cadastro` não pedem pagador.

`GET /v1/billing/plans` e `GET /v1/billing/me` incluem:

```json
{
  "gateway": {
    "provider": "asaas",
    "checkoutMode": "inline",
    "methods": ["card", "pix"],
    "requiresPayer": true,
    "requiresCreditCard": true,
    "available": true
  }
}
```

Stub: `checkoutMode: immediate`, `requiresPayer` / `requiresCreditCard` false. Asaas: `inline` (cartão no painel); PIX continua hosted. `/me` traz `pendingCheckout`, `savedCard` / `savedCards`, `upgradeQuotes` (prorrata), `canScheduleDowngrade`, `scheduledDowngrade`.

`GET /v1/billing/me` (recorte):

```json
{
  "venue": {},
  "entitlement": { "ok": true },
  "canUpgrade": true,
  "canDowngrade": true,
  "canScheduleDowngrade": true,
  "scheduledDowngrade": { "plan": "cardapio", "planName": "Cardápio", "at": "2026-09-25T00:00:00.000Z" },
  "upgradeQuotes": [
    {
      "plan": "auto_atendimento",
      "planName": "Auto atendimento",
      "listPriceCents": 14900,
      "creditCents": 2400,
      "amountCents": 12500,
      "recurringAmountCents": 14900,
      "isUpgrade": true
    }
  ],
  "plans": [],
  "gateway": {},
  "pendingCheckout": null,
  "savedCard": { "id": "uuid", "last4": "4156", "brand": "MASTERCARD" },
  "savedCards": [{ "id": "uuid", "last4": "4156", "brand": "MASTERCARD", "isDefault": true }]
}
```

UI do cartão: `**** {last4}` (e brand se houver). Upgrade: “hoje R$ amount (crédito R$ credit) · depois R$ recurring/mês”.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/v1/billing/plans` | — | Catálogo + `gateway` + `stubDelayMs` |
| GET | `/v1/billing/me` | Owner | Plano, quotes, cartões, `scheduledDowngrade`, `gateway`, `pendingCheckout` |
| POST | `/v1/billing/checkout` | Owner | Body `{ plan, method, payer?, creditCard? }`. Stub → `success`. Cartão Asaas → `success` + token. PIX → `pending` + `checkoutUrl`. Mesmo plano ativo → 409 `ALREADY_SUBSCRIBED`. Downgrade no meio da vigência → 409 `PLAN_DOWNGRADE_LOCKED` |
| POST | `/v1/billing/schedule-downgrade` | Owner | `{ "plan": "cardapio" }` — agenda no fim da vigência |
| GET | `/v1/billing/cards` | Owner | Lista cartões salvos (máx. 5) |
| POST | `/v1/billing/cards` | Owner | `{ creditCard: { holderName, number, expiryMonth, expiryYear, ccv } }` |
| POST | `/v1/billing/cards/{id}/default` | Owner | Marca padrão e sincroniza a subscription Asaas |
| DELETE | `/v1/billing/cards/{id}` | Owner | Remove cartão |
| POST | `/v1/webhooks/asaas` | Header `asaas-access-token` | Eventos Asaas. Sem cookie. |

#### POST /v1/billing/checkout (body)

```json
{
  "plan": "auto_atendimento",
  "method": "card",
  "payer": {
    "name": "Maria Silva",
    "cpfCnpj": "12345678909",
    "email": "maria@bar.com",
    "phone": "11999999999",
    "postalCode": "01310100",
    "addressNumber": "100"
  },
  "creditCard": {
    "holderName": "MARIA SILVA",
    "number": "5162••••••••8829",
    "expiryMonth": "05",
    "expiryYear": "2028",
    "ccv": "318"
  }
}
```

`method`: `card` | `pix` (default `card`). `payer` obrigatório se `gateway.requiresPayer` (ou usa o responsável salvo). No cartão Asaas: `creditCard` **ou** cartão já salvo (`CREDIT_CARD_REQUIRED` / `CARD_REQUIRED` se faltar os dois). CEP e número no pagador quando envia PAN novo. CPF/CNPJ e PAN **não** são persistidos. Token cifrado + last4 + bandeira. Cartão salvo: omitir `creditCard`.

PIX: body sem `creditCard`; resposta `status: pending`, `checkoutUrl`. Cartão Asaas: `status: success` se autorizar, com `amountCents` / `creditCents` / `recurringAmountCents` / `savedCards`. Stub: `status: success`, ignora o cartão, `currentPeriodEndsAt` = fim da cobertura atual + `paidPeriodDays` ([ADR-019](../decisions/ADR-019-vigencia-empilhada.md)).

Callbacks de navegação do PIX (não confirmam pagamento): `/painel/pagamento?checkout=ok|cancel|expired`.

Plano `active` + mesmo SKU + vigência aberta → 409 `ALREADY_SUBSCRIBED` (front esconde o checkout desse plano; CTA “Gerenciar cartão”). Downgrade com vigência paga em aberto → 409 `PLAN_DOWNGRADE_LOCKED` (front oferece agendar). Recurso de Auto atendimento no plano Cardápio → 403 `PLAN_FEATURE`. Trial/vigência vencidos → 403 `BILLING_INACTIVE`. Sem chave Asaas → 503 `PAYMENT_UNAVAILABLE`. Falha HTTP no provedor → 502 `PAYMENT_GATEWAY_ERROR`. Sem pagador no Asaas → 400 `PAYER_REQUIRED`. Sem cartão (e sem token) → 400 `CREDIT_CARD_REQUIRED`.

### Owner — venue e catálogo

Auth: cookie `eaimesa_owner`. Todas as queries filtram pelo `venue_id` da sessão.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/owner/venue` | Nome, slug, public_id, status, `staffCanCloseTabs`, `requireShiftOnOpenCash` |
| PATCH | `/v1/owner/venue` | `{ name?, slug?, staffCanCloseTabs?, requireShiftOnOpenCash?, representative? }` |
| GET | `/v1/owner/catalog` | Categorias + itens (inclui inativos) |
| POST | `/v1/owner/catalog/categories` | `{ name, sortOrder? }` |
| PATCH | `/v1/owner/catalog/categories/{id}` | `{ name?, sortOrder?, active? }` |
| DELETE | `/v1/owner/catalog/categories/{id}` | 409 se ainda houver itens |
| POST | `/v1/owner/catalog/items` | ver body abaixo |
| PATCH | `/v1/owner/catalog/items/{id}` | campos parciais |
| POST | `/v1/owner/catalog/items/{id}/image` | multipart `file` (JPG/PNG/WebP, máx. 2 MB) |
| DELETE | `/v1/owner/catalog/items/{id}` | remove item |
| GET | `/v1/uploads/{file}` | — | Foto enviada (público, nome UUID) |

#### POST /v1/owner/catalog/items (body)

```json
{
  "categoryId": "uuid",
  "name": "Calabresa acebolada",
  "description": "Serve 2",
  "imageUrl": "https://exemplo.com/calabresa.jpg",
  "priceCents": 3290,
  "sortOrder": 0,
  "active": true
}
```

`imageUrl` é opcional. Upload no painel grava um path `/v1/uploads/...` no mesmo campo. O menu público devolve `imageUrl` em cada item.

Preço **sempre** em centavos no servidor. O cliente do painel converte reais → cents.

### Owner — pedidos (fatia 2)

Auth: cookie `eaimesa_owner`. `venue_id` da sessão.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/owner/orders` | Pedidos do venue (48 h; inclui `cancelled`) |
| POST | `/v1/owner/orders` | Pedido de balcão (opcional `tabId`); snapshot de preço |
| PATCH | `/v1/owner/orders/{id}` | `{ status }` |

#### POST /v1/owner/orders (body)

```json
{
  "tabId": "uuid",
  "tableId": "uuid",
  "tableLabel": "Mesa 4",
  "note": "sem gelo",
  "items": [
    { "catalogItemId": "uuid", "qty": 2, "note": null }
  ]
}
```

`source` gravado como `counter`. Status inicial `pending`. Com `tabId`, a comanda precisa estar `open` no venue; mesa e rótulo saem da tab (`TAB_NOT_FOUND` / `TAB_CLOSED`). Sem `tabId`: `tableId` (fatia 3) ou `tableLabel`. Um de `tabId` | `tableId` | `tableLabel` é obrigatório. O front do Kanban **não** chama este POST; o lançamento é o dialog da comanda em `/garcom`. Brief Laravel: [backend-staff-order-tab.md](backend-staff-order-tab.md).

### Owner — mesas (fatia 3)

Auth: cookie `eaimesa_owner`. `venue_id` da sessão. Limite: 15 mesas **ativas**. Disponível no plano **Cardápio** e **Auto atendimento** (Cardápio: só QR/adesivo; sem claim/pedido). Laravel: não responder `PLAN_FEATURE` em tables no Cardápio — ver [backend-waiter-call.md](backend-waiter-call.md).

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/owner/tables` | Todas as mesas (inclui inativas) |
| POST | `/v1/owner/tables` | `{ label, sortOrder? }` |
| PATCH | `/v1/owner/tables/{id}` | `{ label?, sortOrder?, active? }` |
| DELETE | `/v1/owner/tables/{id}` | Remove; pedidos ficam com snapshot do rótulo |

#### POST /v1/owner/tables (body)

```json
{ "label": "Mesa 4", "sortOrder": 4 }
```

Rótulo único por venue. `TABLE_LIMIT` se já houver 15 ativas. `TABLE_LABEL_TAKEN` se o nome já existir.

### Owner — equipe (fatia 4)

Auth: cookie `eaimesa_owner`. Limite: **5 membros ativos** (garçom + caixa + painel). `role`: `staff` (garçom, default) | `cashier` (caixa) | `panel` (Kanban da estação). Caixa vê `/garcom` e sempre encerra. Painel vê só `/painel/pedidos` filtrado por `categoryIds` (mínimo 1 categoria do cardápio). [ADR-021](../decisions/ADR-021-caixa-encerra-comanda.md), [ADR-024](../decisions/ADR-024-kanban-painel-categorias.md). Brief Laravel: [backend-kanban-painel.md](backend-kanban-painel.md).

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/owner/staff` | Lista equipe + `role` + `categoryIds` + contagem ativa |
| POST | `/v1/owner/staff` | `{ name, email, password, role?, categoryIds? }` |
| PATCH | `/v1/owner/staff/{id}` | `{ name?, active?, password?, role?, categoryIds? }` |
| DELETE | `/v1/owner/staff/{id}` | Remove o membro |

### Auth garçom

Removido login separado. Garçom usa `/v1/auth/login` e `/v1/auth/me` (ver acima).

### Staff — mesas e claim (fatia 4)

Auth: cookie com `role: owner | staff` (caixa incluso: JWT `staff` + `member.role=cashier`). Brief para o Laravel: [backend-caixa-close.md](backend-caixa-close.md).

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/staff/tables` | Mesas ativas + `canCloseTabs` + `requireOpenCash` + `cashSessionOpen` + `sessionOpen`, `claimPending`, `openTabCount`, `openTabs`, `pinDisplay` |
| POST | `/v1/staff/tables/{tableId}/claims` | Gera claim (TTL, uso único). Sem caixa e `requireOpenCash` → 409 `CASH_SESSION_REQUIRED` |
| GET | `/v1/staff/tables/{tableId}/tabs` | Comandas + parcial (`totalCents`, `serviceFeePercent`, `serviceFeeCents`, `dueCents`) + `table.pinDisplay` + `unassignedOrders` (pedidos da mesa sem `tab_id`) |
| POST | `/v1/staff/tables/{tableId}/tabs` | Garçom abre comanda `{ name, phone }` (mesmo contrato do guest). Cria sessão/PIN se faltar |
| POST | `/v1/staff/tabs/{tabId}/close` | Fecha uma comanda. Garçom: 403 `CASHIER_REQUIRED` se `staffCanCloseTabs=false` |
| POST | `/v1/staff/tables/{tableId}/close` | Encerra a mesa (409 se ainda houver comanda aberta). Mesma regra de close |

### Staff — caixa por turno (financeiro)

Auth: cookie `role: owner | staff`. Gate `module:finance`. **Só dono e `cashier`** — garçom → 403 `CASHIER_REQUIRED`.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/staff/tabs/{tabId}/settlement` | Preview: subtotal, taxa, total devido |
| POST | `/v1/staff/cash-sessions` | Abre caixa `{ openingFloatCents, onShiftMemberIds? }`; com `requireShiftOnOpenCash` a escala é obrigatória (`400 SHIFT_REQUIRED`); resposta inclui `expectedByMethod` |
| GET | `/v1/staff/cash-sessions/roster` | `{ required, members: [{ id, name, role }] }` — garçom e caixa (sem painel) |
| GET | `/v1/staff/cash-sessions/current` | Caixa aberto + `expectedByMethod` ao vivo (vendas do turno + fundo + movimentações). 404 se nenhum |
| POST | `/v1/staff/cash-sessions/{id}/movements` | `{ type: sangria\|suprimento\|ajuste, amountCents, reason }` |
| POST | `/v1/staff/cash-sessions/{id}/close` | `{ countedByMethod }` — formas omitidas = esperado |

O conferido no fechar caixa **já nasce preenchido** com o esperado. O caixa corrige se a gaveta/maquininha diferir.

`PATCH /v1/owner/modules/finance` `{ config: { requireOpenCash } }`: se `true`, pedido, QR (`claims`) e abrir comanda exigem caixa aberto → 409 `CASH_SESSION_REQUIRED`. `GET /v1/staff/tables` inclui `requireOpenCash` e `cashSessionOpen` para o front bloquear a UI.

### Staff — fila (fatia 8)

Auth: cookie `role: owner | staff`. Mesmas regras de status do Kanban do dono. `member.role=panel`: `GET` devolve só pedidos/itens das `categoryIds` do membro; `POST` e catalog → 403 `PANEL_FORBIDDEN`. Itens incluem `categoryId`.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/staff/orders` | Fila 48h (`pending`…`cancelled`); painel filtra por categoria |
| POST | `/v1/staff/orders` | Pedido na comanda (`tabId`) ou balcão; preço no servidor. Painel: 403 |
| PATCH | `/v1/staff/orders/{id}` | `{ status }` (pedido inteiro; painel só se o pedido tiver item da estação) |
| GET | `/v1/staff/catalog` | Cardápio (leitura) para o dialog de lançar na comanda. Painel: 403 |

Mesmo body de `POST /v1/owner/orders` (`tabId` opcional). Front: mesa → comanda → **Adicionar pedido**.

Resposta de `GET /v1/staff/tables` (recorte):

```json
{
  "canCloseTabs": true,
  "requireOpenCash": false,
  "cashSessionOpen": true,
  "tables": [
    {
      "id": "uuid",
      "label": "Mesa 4",
      "sortOrder": 4,
      "sessionOpen": true,
      "claimPending": false,
      "openTabCount": 2,
      "pinDisplay": "4821",
      "openTabs": [
        { "id": "uuid", "guestName": "Maria", "guestPhoneMasked": "•••• 7777" },
        { "id": "uuid", "guestName": "João", "guestPhoneMasked": "•••• 6666" }
      ]
    }
  ]
}
```

Resposta do claim:

```json
{
  "claimId": "uuid",
  "tableId": "uuid",
  "tableLabel": "Mesa 4",
  "claimUrl": "http://mac-filipe.local:3000/seu-estabelecimento/c/{token}",
  "expiresAt": "2026-…",
  "expiresInSeconds": 180,
  "pinDisplay": "4821"
}
```

### Público — redeem claim (fatia 4)

Cookie guest: `eaimesa_guest`.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/public/venues/{slug}/c/{token}/redeem` | — | Abre/reusa TableSession, PIN (só na 1ª), Set-Cookie guest |

Resposta:

```json
{
  "pinDisplay": "4821",
  "tableLabel": "Mesa 4",
  "slug": "seu-estabelecimento",
  "needsProfile": true,
  "redirectPath": "/seu-estabelecimento/bem-vindo"
}
```

`pinDisplay` é `null` se a mesa já tinha PIN (segundo QR). Front: `/{slug}/c/{token}` → bem-vindo ou `/comanda`.

### Guest — PIN join (fatia 5) e comanda pessoal (fatia 6)

Cookie guest: `eaimesa_guest`. Join não exige cookie. Abrir comanda exige cookie da mesa.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/guest/tabs/join` | — | `{ slug, pin }` → sessão na mesa |
| POST | `/v1/guest/tabs` | Cookie guest | `{ name, phone }` → cria comanda. 409 `TAB_ALREADY_OPEN` se o número já tem comanda `open` no estabelecimento (mesma mesa ou outra) |
| GET | `/v1/guest/tab` | Cookie guest | Mesa + comanda + `pinDisplay` (PIN da mesa, para quem já entrou) |

#### POST /v1/guest/tabs/join (body)

```json
{ "slug": "seu-estabelecimento", "pin": "4821" }
```

PIN casa com **TableSession** `open`. Resposta: `tableLabel`, `slug`, `needsProfile`, `redirectPath` (`/{slug}/comanda`).

#### POST /v1/guest/tabs (body)

```json
{ "name": "Maria", "phone": "11988887777" }
```

Telefone: 10–11 dígitos (DDD + número). O front mascara `(11) 98888-7777`; a API normaliza para só dígitos. Se o número já tem comanda `open` **em outra mesa**, 409 `TAB_ALREADY_OPEN`. Se a comanda `open` for **desta** sessão (ex.: o garçom já abriu), devolve ela e o guest entra nessa conta. Resposta inclui `guestName`, `tableLabel`, `redirectPath`.

### Guest — pedidos (fatia 7)

Cookie `eaimesa_guest` com **tab** `open`. Preço **não** vai no body.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/guest/orders` | Cookie guest | Carrinho → pedido `pending`, `source=guest` |
| GET | `/v1/guest/orders` | Cookie guest | Pedidos da comanda (48h) + `totalCents` (sem cancelados) + taxa (`serviceFeePercent`, `serviceFeeCents`, `dueCents`) |
| GET | `/v1/guest/orders/{id}` | Cookie guest | Um pedido da comanda |

Header obrigatório no POST: `Idempotency-Key` (UUID). Mesma chave no venue devolve o mesmo pedido.

`GET /v1/guest/orders` (recorte):

```json
{
  "totalCents": 3890,
  "serviceFeePercent": 10,
  "serviceFeeCents": 389,
  "dueCents": 4279,
  "orders": [
    {
      "id": "uuid",
      "status": "pending",
      "source": "guest",
      "tableLabel": "Mesa 4",
      "guestName": "Maria",
      "totalCents": 3890,
      "items": [{ "name": "Pão de alho", "qty": 1, "unitPriceCents": 1290 }]
    }
  ]
}
```

Só a comanda do cookie. Cancelados aparecem na lista e **não** somam em `totalCents`. Se `service_fee` estiver desligada, `serviceFeePercent` e `serviceFeeCents` são 0 e `dueCents = totalCents`.

#### POST /v1/guest/orders (body)

```json
{
  "note": "sem gelo",
  "items": [
    { "catalogItemId": "uuid", "qty": 2, "note": "mal passado" }
  ]
}
```

Erros: `PIN_INVALID`, `PIN_LOCKED`, `TAB_CLOSED`, `TAB_REQUIRED`, `TABS_STILL_OPEN`, `SESSION_REQUIRED`, `VENUE_SUSPENDED`, `ITEM_NOT_FOUND`.

#### PATCH /v1/owner/orders/{id}

```json
{ "status": "preparing" }
```

Valores: `pending` | `accepted` | `preparing` | `delivered` | `cancelled`. O board avança `pending` → `preparing` → `delivered`; `accepted` continua válido (legado).

## Planejado (fatias seguintes)

Não implementar agora. Mantido para não perder o contrato do MVP.

### Guest / pedidos

Implementado na fatia 7 (`POST/GET /v1/guest/orders`).

### Staff (além do claim)

Implementado na fatia 8 (`GET/PATCH/POST /v1/staff/orders`). `lock` e SSE continuam fora.

### Owner (além do catálogo)

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/v1/owner/staff/invites` | Convite staff (futuro) |

### Platform (fatia 11)

Cookie: `eaimesa_platform`. Não autoriza `/v1/owner/*`.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/platform/auth/login` | — | Set-Cookie platform |
| POST | `/v1/platform/auth/logout` | — | Clear-Cookie |
| GET | `/v1/platform/auth/me` | Platform | Operador atual |
| GET | `/v1/platform/users` | Platform | Lista operadores SaaS |
| POST | `/v1/platform/users` | Platform | Cadastra operador (`email`, `password` min 8, `name`; `active?`) |
| GET | `/v1/platform/dashboard` | Platform | KPIs + checkouts recentes |
| GET | `/v1/platform/venues` | Platform | Lista tenants (`q`, `plan`, `status`) |
| PATCH | `/v1/platform/venues/{id}` | Platform | Ajuste admin de `trialEndsAt` / `currentPeriodEndsAt` / `subscriptionStatus` |
| POST | `/v1/platform/venues/{id}/suspend` | Platform | `suspended` |
| POST | `/v1/platform/venues/{id}/unsuspend` | Platform | Volta a `trial`/`active`/`past_due` |
| GET | `/v1/platform/plans` | Platform | Catálogo completo (inclui não listados; `kind`, `promoPriceCents`) |
| POST | `/v1/platform/plans` | Platform | Cria SKU: `{ name, kind, priceCents, promoPriceCents?, blurb, features?, listed? }` |
| PATCH | `/v1/platform/plans/{id}` | Platform | Nome, `kind`, preço, promo (`null` limpa), features, `listed` |
| PATCH | `/v1/platform/settings` | Platform | `trialDays`, `paidPeriodDays` |
| GET | `/v1/platform/logs` | Platform | Lista `*.log` em `storage/logs` (`name`, `sizeBytes`, `modifiedAt`) |
| GET | `/v1/platform/logs/{name}` | Platform | Tail + entries Monolog; query `lines` (1–2000, default 200), `level`, `q` |
| GET | `/v1/platform/integration-events` | Platform | Lista webhooks/eventos; query `integration`, `event`, `status`, `q`, `limit` (1–100, default 50) — sem `payload`/`meta` |
| GET | `/v1/platform/integration-events/{id}` | Platform | Detalhe com `payload` + `meta` |

#### GET /v1/platform/users · POST /v1/platform/users

Cookie `eaimesa_platform`. Sem rota pública de cadastro — só quem já está no `/admin`. Rate limit do POST: 10/min/IP. Front: `/admin/equipe`. Ver [fatia 17](../product/fatia-17-platform-equipe.md).

`GET` → `{ "users": [{ "id", "email", "name", "active", "createdAt" }] }`.

`POST` body:

```json
{
  "email": "colega@eaimesa.com",
  "password": "mínimo 8 chars",
  "name": "Colega Ops",
  "active": true
}
```

Resposta 201: o mesmo shape de um item. E-mail único → 409 `EMAIL_TAKEN`. Body inválido → 400 `VALIDATION_ERROR`. Sem cookie → 401.

`GET /v1/platform/venues` query `q`, `plan`, `status`. Resposta:

```json
{
  "venues": [
    {
      "id": "uuid",
      "name": "Seu Estabelecimento",
      "slug": "seu-estabelecimento",
      "plan": "cardapio",
      "planName": "Cardápio",
      "subscriptionStatus": "trial",
      "acceptsOrders": false,
      "trialEndsAt": "2026-08-29T23:59:59.000Z",
      "currentPeriodEndsAt": null,
      "createdAt": "2026-08-22T12:00:00.000Z",
      "ownerEmail": "dono@bar.com"
    }
  ]
}
```

`trialEndsAt` e `currentPeriodEndsAt` são ISO8601 UTC ou `null`. Front: `/admin/bares` mostra a data conforme o status (`trial` → trial; `active`/`past_due` → vigência, com fallback no trial; `suspended` → mesma lógica + badge).

#### PATCH /v1/platform/venues/{id}

Cookie `eaimesa_platform`. Body camelCase; enviar **só** os campos que mudam (ao menos um). Id inválido → 404 `VENUE_NOT_FOUND`.

```json
{
  "trialEndsAt": "2026-09-15T23:59:59.000Z",
  "currentPeriodEndsAt": "2026-10-15T23:59:59.000Z",
  "subscriptionStatus": "active"
}
```

Resposta: o mesmo shape de um item de `venues[]`.

Sem `subscriptionStatus`, a API recalcula: `active` se a vigência paga for futura; senão `trial` se o trial for futuro; senão `past_due`. **Não** recalcula se o estabelecimento já está `suspended` ou se o operador envia `subscriptionStatus`. Não sincroniza cobrança no Asaas — ajuste só no cadastro do estabelecimento. Front não envia `subscriptionStatus` ao salvar datas (deixa o recálculo com a API).

`GET /v1/platform/logs/{name}`: só basename `*.log` sob `storage/logs` (sem path traversal). Resposta: `content` (texto do tail), `entries[]` (`timestamp`, `env`, `level`, `message`, `raw`), `truncated`. `level`/`q` filtram `entries`. Front: `/admin/logs`. Ver [fatia 13](../product/fatia-13-log-viewer.md).

`GET /v1/platform/integration-events`: cookie `eaimesa_platform`. Itens com `id`, `integration`, `kind`, `direction`, `event`, `externalId`, `status`, `errorMessage`, `createdAt`. Lista **não** inclui `payload`/`meta`. Detalhe (`GET .../{id}`): o mesmo + `payload` (body JSON) + `meta` (`ip`, `headers` sanitizados). Id inexistente → 404 `NOT_FOUND`. Front: `/admin/integracoes`. Ver [fatia 16](../product/fatia-16-integration-events.md) e [ADR-027](../decisions/ADR-027-integration-events.md).

`GET /v1/billing/plans` (público) lê `plan_catalog` + settings. Promo preenchida entra como `promoPriceCents` / `effectivePriceCents`. Checkout grava `billing_events` (stub `success`; Asaas `pending` até o webhook).

### Webhooks

- `POST /v1/webhooks/asaas` — assinatura B2B. Auth: header `asaas-access-token` (`ASAAS_WEBHOOK_TOKEN`). Após auth, grava o body em `integration_events` (`integration=asaas`). Redirect `?checkout=ok` **não** confirma. Ver [fatia 12](../product/fatia-12-pagamento-asaas.md) e [fatia 16](../product/fatia-16-integration-events.md).

## Códigos de erro (amostra)

| Code | HTTP |
|------|------|
| `VALIDATION_ERROR` | 400 |
| `UNAUTHORIZED` | 401 |
| `VENUE_NOT_FOUND` | 404 |
| `SLUG_TAKEN` | 409 |
| `SLUG_RESERVED` | 400 |
| `CATEGORY_NOT_EMPTY` | 409 |
| `ORDER_NOT_FOUND` | 404 |
| `TABLE_NOT_FOUND` | 404 |
| `TABLE_LIMIT` | 409 |
| `TABLE_LABEL_TAKEN` | 409 |
| `EMAIL_TAKEN` | 409 |
| `TAB_REQUIRED` | 403 |
| `VENUE_SUSPENDED` | 403 |
| `PLAN_FEATURE` | 403 |
| `PLAN_NOT_LISTED` | 400 |
| `PLAN_DOWNGRADE_LOCKED` | 409 |
| `ALREADY_SUBSCRIBED` | 409 |
| `BILLING_INACTIVE` | 403 |
| `PAYER_REQUIRED` | 400 |
| `CARD_REQUIRED` | 400 |
| `CREDIT_CARD_REQUIRED` | 400 |
| `PAYMENT_UNAVAILABLE` | 503 |
| `PAYMENT_GATEWAY_ERROR` | 502 |
| `CLAIM_EXPIRED` | 410 |
| `CLAIM_ALREADY_USED` | 409 |
| `PIN_INVALID` | 401 |
| `PIN_LOCKED` | 429 |
| `TAB_ALREADY_OPEN` | 409 |
| `STAFF_NOT_FOUND` | 404 |
| `STAFF_LIMIT` | 409 |
| `STAFF_INACTIVE` | 403 |
| `SHIFT_REQUIRED` | 400 |
| `CASHIER_REQUIRED` | 403 |
| `CLAIM_INVALID` | 404 |
| `TAB_CLOSED` | 409 |
| `TABS_STILL_OPEN` | 409 |
| `SESSION_REQUIRED` | 401 |
| `FORBIDDEN_CROSS_VENUE` | 403 |
| `LOG_NOT_FOUND` | 404 |
| `LOG_READ_ERROR` | 500 |
| `NOT_FOUND` | 404 |

OpenAPI: gerar a partir de `routes/api.php` quando o contrato da fatia 1 estabilizar.
