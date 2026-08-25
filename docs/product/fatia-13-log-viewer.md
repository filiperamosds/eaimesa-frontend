# Fatia 13 — Log viewer no console SaaS

Operador EaiMesa consulta os ficheiros de log do Laravel (`storage/logs`) em `/admin/logs`, sem SSH.

## Inclui

- `/admin/logs` no console (nav **Logs**, junto de Dashboard / Estabelecimentos / Planos)
- `GET /v1/platform/logs` — lista `*.log` (`name`, `sizeBytes`, `modifiedAt`)
- `GET /v1/platform/logs/{name}` — tail + entries Monolog (`lines`, `level`, `q`)
- Cookie `eaimesa_platform` (mesmo layout/proteção das outras `/admin/*`)
- Lista de ficheiros + entries com nível colorido; toggle “Texto bruto” (`content`)
- Sem apagar, download zip ou SSE

## Não inclui

- Apagar / truncar / editar logs
- Download binário / zip
- Logs de outros hosts ou CloudWatch
- Streaming SSE / websocket
- Impersonate ou logs por venue

## Superfície

| Path | Quem |
|------|------|
| `/admin/logs` | Operador autenticado |

Deslogado: o shell redireciona para `/admin/login` (401).

## Contrato

Ver [endpoints](../api/endpoints.md). `{name}` = basename `*.log`. `lines` 1–2000 (UI: 100/200/500/1000, default 200). `level` opcional. `truncated: true` → aviso “Mostrando só o final do ficheiro”.

Erros: `401 UNAUTHORIZED`, `400 VALIDATION_ERROR`, `404 LOG_NOT_FOUND`, `500 LOG_READ_ERROR`.

## Fluxo

1. Operador em `/admin` → **Logs**.
2. Lista `laravel.log` (ou daily); default o `laravel.log` se existir.
3. Filtra ERROR / texto; atualiza. Vê entries em monoespaçado.
