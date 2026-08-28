# Fatia 13 — Log viewer no console SaaS

Operador EaiMesa consulta os ficheiros de log do Laravel (`storage/logs`) em `/admin/logs`, sem SSH.

## Inclui

- `/admin/logs` no console (nav **Logs**, junto de Dashboard / Estabelecimentos / Equipe / Planos / Integrações)
- `GET /v1/platform/logs` — lista `*.log` (`name`, `sizeBytes`, `modifiedAt`)
- `GET /v1/platform/logs/{name}` — entries paginadas (`page`, `perPage`, `level`, `q`)
- `POST /v1/platform/logs/{name}/clear` — rotaciona para `{stem}2.log` (ex. `laravel2.log`); não apaga
- Cookie `eaimesa_platform`
- Lista de ficheiros + entries com nível colorido; paginação; toggle “Texto bruto”; botão Limpar

## Não inclui

- Apagar / truncar sem backup
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

Ver [endpoints](../api/endpoints.md). `{name}` = basename `*.log`. `page` 1 = mais recente. `perPage` 50/100/200 (default 50). `truncated: true` → aviso de ficheiro grande (até 8 MiB do fim).

Limpar: confirmação no browser; conteúdo vai para `laravel2.log`; se esse backup já existir, o anterior vira `laravel2-YmdHis.log`.

Erros: `401 UNAUTHORIZED`, `400 VALIDATION_ERROR`, `404 LOG_NOT_FOUND`, `403 FORBIDDEN`, `500 LOG_READ_ERROR`, `500 LOG_ROTATE_FAILED`.

## Fluxo

1. Operador em `/admin` → **Logs**.
2. Lista `laravel.log` (ou daily); default o `laravel.log` se existir.
3. Página 1 = mais recente; **Mais antigos** avança. Filtra ERROR / texto.
4. **Limpar** move para `laravel2.log` e esvazia o ativo.
