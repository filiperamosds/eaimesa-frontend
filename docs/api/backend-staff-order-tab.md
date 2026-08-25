# Backend — pedido do staff na comanda (`tabId`)

Repo: **eaimesa-backend** (Laravel). Front: dialog de mesas em `/garcom`; Kanban não cria pedido.

Não criar path novo. Estender `POST /v1/staff/orders` e `POST /v1/owner/orders`.

Produto: [ADR-022](../decisions/ADR-022-pedido-garcom-na-comanda.md). Contrato: [endpoints.md](endpoints.md).

## Body

```json
{
  "tabId": "uuid",
  "tableId": "uuid",
  "note": null,
  "items": [{ "catalogItemId": "uuid", "qty": 2, "note": null }]
}
```

`tabId` é opcional. Sem ele, o comportamento atual permanece (`tableId` ou `tableLabel`).

Com `tabId`:

1. Tab do mesmo `venue_id`. Senão **404** `TAB_NOT_FOUND`.
2. `status === open`. Senão **409** `TAB_CLOSED`.
3. Mesa e rótulo saem da tab (não do rótulo livre).
4. Se `tableId` vier no body e for diferente de `tab.table_id` → **400** `VALIDATION_ERROR`.
5. Pedido: `source = counter`, `tab_id` preenchido, `status = pending`, preço snapshot no servidor.

## Onde mudar

Validação em `StaffController::createOrder` e `OwnerOpsController::createOrder`:

```php
'tabId' => 'nullable|uuid',
'tableId' => 'nullable|uuid',
'tableLabel' => 'nullable|string|max:40',
'note' => 'nullable|string|max:240',
'items' => 'required|array|min:1',
'items.*.catalogItemId' => 'required|uuid',
'items.*.qty' => 'required|integer|min:1|max:99',
'items.*.note' => 'nullable|string|max:80',
```

`Orders::createCounter`: resolver a tab aberta, gravar `tab_id`, mesa da tab.

Sem migration: `orders.tab_id` já existe.

`GET /v1/staff/tables/{id}/tabs` precisa listar os pedidos **da comanda** (`tab_id`) **e** `unassignedOrders` da mesa (`table_id` + `tab_id` nulo). Sem isso o Kanban mostra o pedido e a mesa não.

## Garçom abre comanda e vê o PIN

Não criar family nova. `POST` no recurso que já tem `GET`:

`POST /v1/staff/tables/{tableId}/tabs`

```json
{ "name": "Maria", "phone": "11988887777" }
```

Regras iguais a `POST /v1/guest/tabs` (`TAB_ALREADY_OPEN` se o telefone já tem comanda `open` **em outra** mesa). Neste venue, se a comanda `open` for **desta** sessão, devolve ela. Se a mesa não tem `TableSession` `open`, cria sessão + PIN (4 dígitos) — o garçom precisa do código para passar ao cliente.

`POST /v1/staff/tables/{id}/claims`: se não houver sessão `open`, criar sessão + PIN **antes** do primeiro redeem. Resposta inclui `pinDisplay`.

`GET /v1/staff/tables` e `GET .../tabs`: incluir `pinDisplay` (via `TableSession::plainPin()`). O model esconde `pin_display`; não serializar o atributo cru.

### Rotas

```php
Route::post('staff/tables/{tableId}/tabs', [StaffController::class, 'createTab']);
```

Já existe `GET staff/tables/{tableId}/tabs`.
