# Backend — caixa, `staffCanCloseTabs` e close de comanda/mesa

Repo: **eaimesa-backend** (Laravel). Front: Configurações (`/painel/configuracoes/*`) + check em Estabelecimento + perfil Caixa na Equipe.

Não criar path novo. Cookie `eaimesa_owner`. JWT continua `role: owner | staff`. Caixa e garçom compartilham JWT `staff`; o perfil vai em `member.role`.

Produto: [ADR-021](../decisions/ADR-021-caixa-encerra-comanda.md). Contrato geral: [endpoints.md](endpoints.md).

## Banco

```php
Schema::table('venues', function (Blueprint $table) {
    $table->boolean('staff_can_close_tabs')->default(true)->after('accepts_orders');
});
```

Default **true** para o salão atual não quebrar (garçom continua encerrando até o dono desligar).

`venue_members.role` já é string. Passar a gravar:

| Valor | Quem |
|-------|------|
| `staff` | Garçom (default) |
| `cashier` | Caixa |

Sem migration extra em `venue_members`.

Model `Venue`: incluir `staff_can_close_tabs` no `$fillable` e no `casts()` como `boolean`.

Depois: `php artisan migrate`.

## Quem pode encerrar

Aplica em:

- `POST /v1/staff/tabs/{id}/close`
- `POST /v1/staff/tables/{id}/close`

| Quem | Pode? |
|------|--------|
| Dono (`JWT role=owner`) | sempre |
| Caixa (`member.role === cashier`) | sempre |
| Garçom (`member.role === staff`) | só se `venues.staff_can_close_tabs === true` |

Garçom sem permissão → **403**

```json
{
  "error": {
    "code": "CASHIER_REQUIRED",
    "message": "Só o caixa pode encerrar comanda e mesa."
  }
}
```

Helper (`app/Support/StaffAccess.php`):

1. actor `role === owner` → true  
2. `venue.staff_can_close_tabs` → true  
3. membro `role === cashier` → true  
4. senão → `assertCanClose` lança `CASHIER_REQUIRED`

## Contrato HTTP (camelCase)

### 1. Venue serializado

Incluir em `Billing::serializeVenue` (vale para login, `GET /v1/auth/me`, `GET/PATCH /v1/owner/venue`):

```json
"staffCanCloseTabs": true
```

Fallback se a coluna ainda não existir: `(bool) ($v->staff_can_close_tabs ?? true)`.

### 2. `PATCH /v1/owner/venue`

Body — só campos que mudam; **ao menos um**:

```json
{
  "name": "Seu Estabelecimento",
  "slug": "seu-estabelecimento",
  "staffCanCloseTabs": false
}
```

Validação: se não vier `name`, `slug` nem `staffCanCloseTabs` → 400 `VALIDATION_ERROR` (`Envie name, slug e/ou staffCanCloseTabs.`).

`staffCanCloseTabs` → coluna `staff_can_close_tabs` (`$request->boolean('staffCanCloseTabs')`).

Resposta: mesmo shape de `GET /v1/owner/venue` (já com `staffCanCloseTabs`).

### 3. Equipe — `GET /v1/owner/staff`

Cada item:

```json
{
  "id": "uuid",
  "name": "Maria",
  "email": "maria@bar.com",
  "role": "staff",
  "active": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

`role`: `staff` | `cashier`.

### 4. `POST /v1/owner/staff`

```json
{
  "name": "João",
  "email": "caixa@bar.com",
  "password": "mínimo 8",
  "role": "cashier"
}
```

- `role` opcional, `in:staff,cashier`, default `staff`.
- Limite de 5 ativos **não muda** (garçom + caixa somam).

### 5. `PATCH /v1/owner/staff/{id}`

```json
{
  "name": "...",
  "active": true,
  "password": "...",
  "role": "cashier"
}
```

Ao menos um campo. `role` inválido → 400 `VALIDATION_ERROR` (`Perfil: garçom ou caixa.`).

### 6. Auth — `POST /v1/auth/login` e `GET /v1/auth/me`

Staff/caixa:

```json
{
  "role": "staff",
  "redirectPath": "/garcom",
  "account": { "id": "...", "email": "..." },
  "member": { "id": "...", "name": "...", "role": "cashier" },
  "venue": { "staffCanCloseTabs": true }
}
```

- JWT **não** ganha claim `cashier`. Continua `role: staff` + `memberId`.
- Caixa cai no mesmo `/garcom` que o garçom.

### 7. `GET /v1/staff/tables`

```json
{
  "canCloseTabs": false,
  "tables": [ ]
}
```

`canCloseTabs` = resultado do helper (dono/caixa/flag). O front usa isso para esconder “Fechar comanda” / “Encerrar mesa”.

## Arquivos Laravel

| Arquivo | O quê |
|---------|--------|
| `database/migrations/2026_08_23_000001_venue_staff_can_close_tabs.php` | coluna `staff_can_close_tabs` default true |
| `app/Support/StaffAccess.php` | `canClose` / `assertCanClose` |
| `app/Models/Venue.php` | fillable + cast |
| `app/Services/Billing.php` | `staffCanCloseTabs` no serialize |
| `app/Http/Controllers/Api/OwnerController.php` | `patchVenue` aceita a flag |
| `app/Http/Controllers/Api/OwnerOpsController.php` | `role` no create/patch/payload |
| `app/Http/Controllers/Api/AuthController.php` | `member.role` no login e no me |
| `app/Http/Controllers/Api/StaffController.php` | `canCloseTabs` na lista; assert nos dois close |

## O que **não** mudar

- Paths de close, claim, fila, login.
- Cookie / secret JWT.
- Middleware `venue.actor` (caixa entra como `staff`).
- App `/caixa` — não existe; é o mesmo `/garcom`.
