# ADR-027: Eventos de integração (webhooks) auditáveis

**Status:** Aceito  
**Data:** 2026-08-26

## Contexto

Webhooks do Asaas atualizavam billing sem deixar o body bruto consultável. Operadores no console precisavam de SSH/logs para depurar PIX, renovação ou eventos ignorados.

## Decisão

1. Tabela genérica `integration_events` no Laravel: `integration` (ex. `asaas`), `kind` (`webhook`), `direction` (`inbound`), `event`, `external_id`, `status`, `payload` (JSON do body), `meta` (headers sanitizados + IP), `error_message`, `created_at`.
2. Após auth do webhook (token ok), gravar **sempre** o body — inclusive eventos ignorados. Atualizar `status` para `processed` / `ignored` / `failed` conforme o handler.
3. **Não** gravar o header `asaas-access-token` (nem Authorization/Cookie) em `meta`.
4. Console: `GET /v1/platform/integration-events` + `GET /v1/platform/integration-events/{id}` (cookie platform). UI em `/admin/integracoes` (drawer de detalhe; export estático sem rota `[id]`).
5. Sem retention automática nesta fatia (pode vir depois).

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Só o log viewer (`/admin/logs`) | Body do webhook não é Monolog; falta filtro por evento/status |
| Rota `/admin/integracoes/[id]` | `output: "export"` exige `generateStaticParams` para cada UUID |
| Reprocessar na UI | Fora do escopo; risco de cobrir duas vezes |

## Consequências

- Debugging de gateway sem SSH.
- Volume cresce com cada webhook — monitorar tamanho; índices por `integration` + `created_at`.
- Outras integrações (futuro) reusam a mesma tabela e a mesma tela.
- Front: zod em `packages/shared` (`platform-integration-events`).
