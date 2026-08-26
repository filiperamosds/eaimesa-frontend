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

## Implementado (fatias 1–13)

### Saúde

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | — | Liveness (fora de `/v1`) |

### Auth estabelecimento (dono e garçom)

Cookie: `eaimesa_owner` (httpOnly, SameSite=Lax, Path=/). JWT inclui `role: owner | staff`. Garçom, caixa e painel compartilham JWT `staff`; o perfil está em `member.role` (`staff` | `cashier` | `panel`). Painel: `redirectPath` `/painel/pedidos` e `member.categoryIds`.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/auth/register` | — | Cria account + venue (role owner); Set-Cookie |
| POST | `/v1/auth/login` | — | E-mail/senha; owner ou staff; Set-Cookie + `redirectPath` |
| POST | `/v1/auth/logout` | Cookie | Clear-Cookie |
| GET | `/v1/auth/me` | Cookie | `role` (`owner` \| `staff`), account, venue (`staffCanCloseTabs`); `member` se staff (`id`, `name`, `role`: `staff` \| `cashier` \| `panel`, `categoryIds` se painel) |

#### POST /v1/auth/register (body)

```json
{
  "email": "dono@bar.com",
  "password": "mínimo 8 chars",
  "venueName": "Bar do Tião",
  "slug": "bar-do-tiao",
  "plan": "auto_atendimento"
}
```

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

### Billing (fatias 10 e 12)

Driver em `PAYMENT_GATEWAY`: `stub` (local, `success` após ~2s) ou `asaas`. **Cartão** é digitado no painel e o Laravel encaminha ao Asaas ([ADR-020](../decisions/ADR-020-cartao-no-painel.md)). **PIX** usa checkout hospedado. Confirmação PIX só no webhook. Landing, `/preco` e `/cadastro` não pedem pagador.

`GET /v1/billing/plans` e `GET /v1/billing/me` incluem:

```json
{
  "gateway": {
    "provider": "stub",
    "checkoutMode": "immediate",
    "methods": ["card", "pix"],
    "requiresPayer": false,
    "available": true
  }
}
```

No Asaas: `checkoutMode: hosted` (PIX), `requiresPayer: true`. Cartão: captura no painel + token em `venue_billing`. `/me` ainda traz `pendingCheckout` (`url`, `plan`, `method`, `amountCents`) se a sessão PIX hosted estiver aberta.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/v1/billing/plans` | — | Catálogo + `gateway` + `stubDelayMs` |
| GET | `/v1/billing/me` | Owner | Plano atual, `canUpgrade` / `canDowngrade`, `gateway`, `pendingCheckout` |
| POST | `/v1/billing/checkout` | Owner | Inicia cobrança. Stub → `success`. Cartão Asaas → `success` + token. PIX Asaas → `pending` + `checkoutUrl` |
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

`method`: `card` | `pix` (default `card`). `payer` obrigatório se `gateway.requiresPayer`. No cartão Asaas: `creditCard` obrigatório (`CARD_REQUIRED`); CEP e número do endereço no pagador. CPF/CNPJ e PAN **não** são persistidos. O Asaas devolve `creditCardToken`; gravamos token cifrado + last4 + bandeira.

PIX: body sem `creditCard`; resposta `status: pending`, `checkoutUrl`. Cartão Asaas: `status: success` se a cobrança autorizar. Stub: `status: success`, ignora o cartão, `currentPeriodEndsAt` = fim da cobertura atual + `paidPeriodDays` ([ADR-019](../decisions/ADR-019-vigencia-empilhada.md)).

Callbacks de navegação do PIX (não confirmam pagamento): `/painel/pagamento?checkout=ok|cancel|expired`.

Downgrade com vigência paga em aberto → 409 `PLAN_DOWNGRADE_LOCKED`. Recurso de Auto atendimento no plano Cardápio → 403 `PLAN_FEATURE`. Trial/vigência vencidos → 403 `BILLING_INACTIVE`. Sem chave Asaas → 503 `PAYMENT_UNAVAILABLE`. Falha HTTP no provedor → 502 `PAYMENT_GATEWAY_ERROR`. Sem pagador no Asaas → 400 `PAYER_REQUIRED`. Sem cartão no Asaas → 400 `CARD_REQUIRED`.

### Owner — venue e catálogo

Auth: cookie `eaimesa_owner`. Todas as queries filtram pelo `venue_id` da sessão.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/owner/venue` | Nome, slug, public_id, status, `staffCanCloseTabs` |
| PATCH | `/v1/owner/venue` | `{ name?, slug?, staffCanCloseTabs?, representative? }` |
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
| GET | `/v1/owner/orders` | Pedidos do venue (sem `cancelled`, 48 h) |
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
| GET | `/v1/staff/tables` | Mesas ativas + `canCloseTabs` + `sessionOpen`, `claimPending`, `openTabCount`, `openTabs`, `pinDisplay` |
| POST | `/v1/staff/tables/{tableId}/claims` | Gera claim (TTL, uso único). Abre sessão + PIN se a mesa ainda não tiver. Body de resposta inclui `pinDisplay` |
| GET | `/v1/staff/tables/{tableId}/tabs` | Comandas + parcial + `table.pinDisplay` + `unassignedOrders` (pedidos da mesa sem `tab_id`) |
| POST | `/v1/staff/tables/{tableId}/tabs` | Garçom abre comanda `{ name, phone }` (mesmo contrato do guest). Cria sessão/PIN se faltar |
| POST | `/v1/staff/tabs/{tabId}/close` | Fecha uma comanda. Garçom: 403 `CASHIER_REQUIRED` se `staffCanCloseTabs=false` |
| POST | `/v1/staff/tables/{tableId}/close` | Encerra a mesa (409 se ainda houver comanda aberta). Mesma regra de close |

### Staff — fila (fatia 8)

Auth: cookie `role: owner | staff`. Mesmas regras de status do Kanban do dono. `member.role=panel`: `GET` devolve só pedidos/itens das `categoryIds` do membro; `POST` e catalog → 403 `PANEL_FORBIDDEN`. Itens incluem `categoryId`.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/staff/orders` | Fila 48h (`pending`…`delivered`); painel filtra por categoria |
| POST | `/v1/staff/orders` | Pedido na comanda (`tabId`) ou balcão; preço no servidor. Painel: 403 |
| PATCH | `/v1/staff/orders/{id}` | `{ status }` (pedido inteiro; painel só se o pedido tiver item da estação) |
| GET | `/v1/staff/catalog` | Cardápio (leitura) para o dialog de lançar na comanda. Painel: 403 |

Mesmo body de `POST /v1/owner/orders` (`tabId` opcional). Front: mesa → comanda → **Adicionar pedido**.

Resposta de `GET /v1/staff/tables` (recorte):

```json
{
  "canCloseTabs": true,
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
  "claimUrl": "http://mac-filipe.local:3000/bar-do-tiao/c/{token}",
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
  "slug": "bar-do-tiao",
  "needsProfile": true,
  "redirectPath": "/bar-do-tiao/bem-vindo"
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
{ "slug": "bar-do-tiao", "pin": "4821" }
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
| GET | `/v1/guest/orders` | Cookie guest | Pedidos da comanda (48h) + `totalCents` (sem cancelados) |
| GET | `/v1/guest/orders/{id}` | Cookie guest | Um pedido da comanda |

Header obrigatório no POST: `Idempotency-Key` (UUID). Mesma chave no venue devolve o mesmo pedido.

`GET /v1/guest/orders` (recorte):

```json
{
  "totalCents": 3890,
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

Só a comanda do cookie. Cancelados aparecem na lista e **não** somam em `totalCents`.

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
{ "status": "accepted" }
```

Valores: `pending` | `accepted` | `preparing` | `delivered` | `cancelled`.

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

`GET /v1/platform/venues` query `q`, `plan`, `status`. Resposta:

```json
{
  "venues": [
    {
      "id": "uuid",
      "name": "Bar do Tião",
      "slug": "bar-do-tiao",
      "plan": "auto_atendimento",
      "planName": "Auto atendimento",
      "subscriptionStatus": "trial",
      "acceptsOrders": true,
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
| `BILLING_INACTIVE` | 403 |
| `PAYER_REQUIRED` | 400 |
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
