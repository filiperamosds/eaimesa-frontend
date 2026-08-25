# Backend — Chamar garçom (presença + fila)

Repo: **eaimesa-backend** (Laravel). Front: fatia 15 / [ADR-026](../decisions/ADR-026-chamar-garcom-qr-mesa.md).

Não inventar paths diferentes destes no front.

## Modelo

### Venue (campos novos)

| Coluna / API | Tipo | Default |
|--------------|------|---------|
| `waiter_call_enabled` / `waiterCallEnabled` | bool | `false` |
| `waiter_call_ttl_minutes` / `waiterCallTtlMinutes` | int 15–480 | `120` |

`PATCH /v1/owner/venue` aceita esses campos (além de name/slug/representative/…).

### VenueTable

| Campo | Nota |
|-------|------|
| `menu_code` / `menuCode` | string 8 chars URL-safe, único por venue, gerado no create; estável ao renomear o rótulo |

Plano `kind=cardapio`: permitir CRUD de mesas (mesmo limite 15) — sem claim/staff/orders.

### PresenceSession

| Campo | Nota |
|-------|------|
| `id` | UUID |
| `venue_id`, `table_id` | FK |
| `token_hash` | cookie aponta para id/token |
| `expires_at` | `now + waiter_call_ttl_minutes` no create |
| `created_at` | |

Cookie: `eaimesa_presence` httpOnly; Secure; SameSite=Lax. **Não** misturar com `eaimesa_guest`.

### WaiterCall

| Campo | Nota |
|-------|------|
| `id` | UUID |
| `venue_id`, `table_id` | |
| `presence_session_id` | opcional auditoria |
| `status` | `open` \| `acked` \| `expired` |
| `created_at`, `acked_at` | |

## Endpoints

### Config + venue

| Método | Path | Body / notas |
|--------|------|----------------|
| GET | `/v1/owner/venue` | Inclui `waiterCallEnabled`, `waiterCallTtlMinutes` |
| PATCH | `/v1/owner/venue` | `{ waiterCallEnabled?, waiterCallTtlMinutes? }` |
| GET/POST/PATCH/DELETE | `/v1/owner/tables` | No Cardápio: liberar (sem `PLAN_FEATURE`). Resposta da mesa inclui `menuCode` |

### Público — presença

| Método | Path | Auth |
|--------|------|------|
| POST | `/v1/public/venues/{slug}/presence` | — |

Body:

```json
{ "mesa": "ab12cd34" }
```

Regras:

- `mesa` = `menuCode` da mesa **ativa** do venue.
- Se `waiterCallEnabled=false` → 403 `FEATURE_DISABLED` (ou 404 genérico).
- Sucesso: cria/renova `PresenceSession`, `Set-Cookie: eaimesa_presence`, body `{ tableLabel, expiresAt, expiresInSeconds }`.
- Rate limit por IP (ex. 30/min).

### Público — cardápio

`GET /v1/public/venues/{slug}` passa a incluir (quando fizer sentido no payload):

```json
{
  "waiterCallEnabled": true,
  "waiterCallTtlMinutes": 120
}
```

(Front ainda precisa da presença via cookie para mostrar o botão.)

### Público — chamar

| Método | Path | Auth |
|--------|------|------|
| POST | `/v1/public/waiter-calls` | Cookie `eaimesa_presence` |
| GET | `/v1/public/presence` | Cookie — `{ tableLabel, expiresAt }` ou 401 |

`POST /v1/public/waiter-calls`:

- Sem cookie / expirado → 401 `SESSION_REQUIRED`
- Feature off → 403 `FEATURE_DISABLED`
- Já existe `open` para a mesma mesa nos últimos N minutos (ex. 2) → 200 idempotente (devolve a mesma) ou 409 `CALL_ALREADY_OPEN` — preferir **idempotente** para não spammar a fila
- Rate limit: ex. 1 create “novo” / 60s / presença

### Dono — fila

| Método | Path | Auth |
|--------|------|------|
| GET | `/v1/owner/waiter-calls?status=open` | owner |
| PATCH | `/v1/owner/waiter-calls/{id}` | `{ "status": "acked" }` |

Lista: `{ id, tableId, tableLabel, createdAt, status }[]` ordenada por `created_at` ASC.

## Erros

| Código | HTTP |
|--------|------|
| `FEATURE_DISABLED` | 403 |
| `SESSION_REQUIRED` | 401 |
| `TABLE_NOT_FOUND` | 404 |
| `CALL_NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | 400 |
| `PLAN_FEATURE` | 403 — **não** usar para tables no Cardápio nesta fatia |

Front: botão no `/{slug}` após presença; **Configurações → Mesas/Chamada**; fila em `/painel/chamados`. Bootstrap: QR com `?mesa=` → front grava em `sessionStorage` e remove da URL; POST presence usa o código guardado. Enquanto o Laravel responder `PLAN_FEATURE` em `/v1/owner/tables` ou não tiver presença/waiter-calls, a UI fica sem botão / com erro de API.

## Fora

- Staff `/v1/staff/waiter-calls` (pode vir depois)
- SSE / push
- Invalidar presença ao ack (não precisa)
