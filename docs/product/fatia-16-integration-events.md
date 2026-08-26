# Fatia 16 — Eventos de integração (webhooks no console)

Operador EaiMesa consulta o histórico de webhooks recebidos (começando pelo Asaas) em `/admin/integracoes`, sem SSH.

No backend Laravel este contrato está documentado como fatia 14 + [ADR-027](../decisions/ADR-027-integration-events.md). Neste front, fatia 14 já é o Kanban Painel.

## Inclui

- `/admin/integracoes` no console (nav **Integrações**, junto de Dashboard / Estabelecimentos / Equipe / Planos / Logs)
- `GET /v1/platform/integration-events` — lista (`integration`, `event`, `status`, `q`, `limit`) **sem** `payload` / `meta`
- `GET /v1/platform/integration-events/{id}` — detalhe com `payload` + `meta`
- Cookie `eaimesa_platform` (mesmo layout/proteção das outras `/admin/*`)
- Filtros + tabela; clique abre drawer com JSON e **Copiar JSON**
- Sem reprocessar, apagar ou SSE

## Não inclui

- Reprocessar / reenviar webhook
- Apagar eventos pela UI
- Retention / purge
- Outras integrações além de Asaas (só o filtro `asaas` na UI)
- Streaming SSE
- Rota `/admin/integracoes/[id]` (export estático; detalhe é drawer)

## Superfície

| Path | Quem |
|------|------|
| `/admin/integracoes` | Operador autenticado |

Deslogado: o shell redireciona para `/admin/login` (401).

## Contrato

Ver [endpoints](../api/endpoints.md). Query da lista:

| Param | Default | Notas |
|-------|---------|--------|
| `integration` | — | UI: Todos + `asaas` |
| `event` | — | nome bruto (ex. `PAYMENT_RECEIVED`) |
| `status` | — | `received` \| `processed` \| `ignored` \| `failed` |
| `q` | — | substring em `event` ou `externalId` (máx. 200) |
| `limit` | `50` | UI: 25 / 50 / 100 |

Lista: `id`, `integration`, `kind`, `direction`, `event`, `externalId`, `status`, `errorMessage`, `createdAt`.

Detalhe: o mesmo + `payload` (body JSON) + `meta` (`ip`, `headers` sanitizados).

Erros: `401 UNAUTHORIZED`, `400 VALIDATION_ERROR`, `404 NOT_FOUND`.

## Fluxo

1. Operador em `/admin` → **Integrações**.
2. Filtra (ex. asaas + `PAYMENT_RECEIVED`) e **Atualizar**.
3. Clica na linha → drawer com JSON (`payload` + `meta.headers`); **Copiar JSON**.
4. `errorMessage` aparece como alerta curto no detalhe.
