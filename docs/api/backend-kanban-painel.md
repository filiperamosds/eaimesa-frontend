# Prompt para o agente do backend (Laravel)

Cole isto no agente do repo **eaimesa-backend**. Front já está nesta fatia: perfil `panel`, Kanban em `/painel/pedidos`, `categoryIds` no cadastro da equipe.

Não inventar path. Cookie `eaimesa_owner`. JWT continua `role: owner | staff`. O perfil Painel vai em `member.role = panel`, no mesmo padrão do caixa (`cashier`).

Produto: [ADR-024](../decisions/ADR-024-kanban-painel-categorias.md). Contrato: [endpoints.md](endpoints.md).

## O que o front já envia / espera

- `POST /v1/owner/staff` `{ name, email, password, role: "panel", categoryIds: ["uuid", ...] }` — `categoryIds` obrigatório se `role=panel` (mínimo 1 UUID do cardápio do venue).
- `PATCH /v1/owner/staff/{id}` `{ role?, categoryIds? }`. Mudar para `panel` exige categorias. Sair de `panel` pode mandar `categoryIds: []`.
- `GET /v1/owner/staff` cada membro: `role` + `categoryIds` (array; vazio se não for painel).
- `POST /v1/auth/login` e `GET /v1/auth/me`: `member.role` pode ser `panel`; `member.categoryIds`; `member.printViaGroups`; `redirectPath: "/painel/pedidos"`.
- `GET /v1/staff/orders` (e o PATCH de status): usuário Painel **só** vê pedidos que tenham **ao menos um** item cuja categoria está em `categoryIds`. Na resposta, **só esses itens**. `totalCents` = soma dos itens visíveis. Dono e garçom/caixa **não** filtram.
- Cada item de pedido: `categoryId` (UUID da categoria no snapshot).
- Painel **não** chama mesas, claim, close, `POST /v1/staff/orders`, `GET /v1/staff/catalog`. Se chamar → 403 `PANEL_FORBIDDEN`.

## Banco

Tabela pivot (nome livre, desde que o serialize use `categoryIds`):

```php
Schema::create('venue_member_categories', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('venue_member_id')->constrained('venue_members')->cascadeOnDelete();
    $table->foreignUuid('catalog_category_id')->constrained('catalog_categories')->cascadeOnDelete();
    $table->timestamps();
    $table->unique(['venue_member_id', 'catalog_category_id']);
});
```

Snapshot no item do pedido (não depender do cardápio atual):

```php
Schema::table('order_items', function (Blueprint $table) {
    $table->foreignUuid('category_id')->nullable()->after('catalog_item_id');
});
```

Ao **criar** pedido (guest ou counter), copiar `catalog_items.category_id` para `order_items.category_id`. Pedidos antigos: no GET, fallback `catalog_items.category_id` se o snapshot for null.

`venue_members.role` já é string. Passar a gravar também `panel`.

Depois: `php artisan migrate`.

## Regras

| Quem | Home | Kanban | Mesas / close / lançar |
|------|------|--------|-------------------------|
| Dono | `/painel/pedidos` | todos os itens | sim |
| Garçom (`staff`) | `/garcom` | todos (`GET /v1/staff/orders`) | close se flag |
| Caixa (`cashier`) | `/garcom` | todos | close sempre |
| Painel (`panel`) | `/painel/pedidos` | filtrado por `categoryIds` | 403 `PANEL_FORBIDDEN` |

Pedido **misto**: aparece nos dois Kanbans, cada um só com os itens da estação. `PATCH` de status altera o **pedido inteiro** (não há status por item nesta fatia). PATCH de um pedido que o painel não deveria ver → 404 `ORDER_NOT_FOUND` (não vazar existência).

Validação:

- `role` `in:staff,cashier,panel` (default `staff`).
- `role=panel` e `categoryIds` vazio → 400 `PANEL_CATEGORIES_REQUIRED` (“Selecione ao menos uma categoria do cardápio.”).
- Cada id em `categoryIds` deve ser categoria **deste** venue. Id de outro bar → 400 `VALIDATION_ERROR`.
- Limite de 5 ativos **inclui** Painel.
- `sessionCanCloseTabs` / helper de close: `panel` → false.

## Contrato HTTP (camelCase)

### Login / me (staff painel)

```json
{
  "role": "staff",
  "redirectPath": "/painel/pedidos",
  "account": { "id": "...", "email": "cozinha@bar.com" },
  "member": {
    "id": "...",
    "name": "Cozinha",
    "role": "panel",
    "categoryIds": ["uuid-pratos", "uuid-porcoes"],
    "printViaGroups": false
  },
  "venue": { "staffCanCloseTabs": true }
}
```

JWT **não** ganha claim `panel`. Continua `role: staff` + `memberId`.

### POST /v1/owner/staff

```json
{
  "name": "Bar",
  "email": "bar@bar.com",
  "password": "mínimo 8",
  "role": "panel",
  "categoryIds": ["uuid-bebidas"],
  "printViaGroups": false
}
```

### GET /v1/staff/orders (painel)

Cada `items[]`:

```json
{
  "id": "uuid",
  "catalogItemId": "uuid",
  "categoryId": "uuid",
  "name": "Heineken",
  "unitPriceCents": 1400,
  "qty": 2,
  "note": null
}
```

Dono (`GET /v1/owner/orders`) e garçom/caixa também passam a devolver `categoryId` (não filtram).

## Arquivos Laravel (ajustar aos nomes reais do repo)

| Arquivo | O quê |
|---------|--------|
| `database/migrations/*_venue_member_categories.php` | pivot |
| `database/migrations/*_order_items_category_id.php` | snapshot |
| `app/Models/VenueMember.php` | `belongsToMany` categorias; `role` inclui `panel` |
| `app/Models/OrderItem.php` | `category_id`; serialize `categoryId` |
| `app/Support/StaffAccess.php` (ou equivalente) | `assertNotPanel` nas rotas de mesa/claim/close/POST order; close = false para panel |
| `app/Http/Controllers/Api/OwnerOpsController.php` | `role` + `categoryIds` create/patch/list |
| `app/Http/Controllers/Api/AuthController.php` | `member.role`, `categoryIds`, `redirectPath` |
| `app/Http/Controllers/Api/StaffController.php` | filtro no `index` de orders; 403 no resto |
| Criação de pedido (guest + counter) | gravar `order_items.category_id` |

## Códigos de erro

| Código | HTTP | Quando |
|--------|------|--------|
| `PANEL_CATEGORIES_REQUIRED` | 400 | Painel sem categoria |
| `PANEL_FORBIDDEN` | 403 | Painel em mesa, claim, close, POST order, catalog staff |
| `VALIDATION_ERROR` | 400 | UUID inválido / categoria de outro venue |
| `ORDER_NOT_FOUND` | 404 | PATCH de pedido fora da estação |

## O que **não** mudar

- Paths de orders, staff, login.
- Cookie / secret JWT.
- Middleware `venue.actor` (painel entra como `staff`).
- App `/kds` — não existe; é `/painel/pedidos`.
- Status por item.
- Limite de 5 ativos (não excluir Painel do teto).

## Conferência rápida

1. Criar membro `role=panel` com 1 categoria → login → `redirectPath` `/painel/pedidos`.
2. Pedido com item dessa categoria aparece em `GET /v1/staff/orders`; item de outra categoria não.
3. Pedido misto: só os itens da estação; `totalCents` bate com esses itens.
4. `POST /v1/staff/tables/{id}/claims` com cookie do painel → 403 `PANEL_FORBIDDEN`.
5. Dono continua vendo o pedido inteiro em `GET /v1/owner/orders`.
