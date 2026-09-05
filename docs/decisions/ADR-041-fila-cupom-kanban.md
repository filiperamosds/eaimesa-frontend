# ADR-041: Fila de cupom da comanda no Kanban

**Status:** Aceito  
**Data:** 2026-09-05  
**Depende de:** [ADR-029](ADR-029-cupom-escpos-usb.md)

## Contexto

A POS80 fala USB/serial **neste Chrome**. O garçom no celular não tem a térmica. **Imprimir** no cupom da comanda falhava ou pedia um dispositivo que o telefone não tem.

O Kanban (`/painel/pedidos`, `/garcom/pedidos`, monitor Painel) já é o lugar onde a térmica está autorizada.

## Decisão

- Com térmica **já autorizada** neste Chrome: o cupom sai na hora (comportamento atual).
- Sem térmica neste aparelho: `POST /v1/staff/tabs/{tabId}/print` cria um `print_jobs` (`kind=tab_receipt`, `pending`). Job `pending`/`printing` da mesma comanda é reusado (toque duplo não gera duas vias).
- Kanban com USB/serial concedido: `POST /v1/staff/print-jobs/next` **reclama** o mais antigo (`pending` → `printing`, lock). Imprime ESC/POS e `PATCH { status: "printed" }`. Falha USB → `failed`. Claim parado > 60 s volta a `pending`. Job `pending` > 30 min → `expired`.
- Primeiro Kanban que reclama imprime; os outros não duplicam. Não é agente local nem fila por IP.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| WebUSB no celular | iOS não tem; Android quase nunca está plugado na POS80 |
| Agente local / QZ | Continua fora do MVP |
| Reusar `orders.printed_at` | Isso é via de cozinha, não cupom da comanda |

## Consequências

- Perfil Painel não enfileira (não acessa mesas); consome a fila se o monitor tiver a térmica.
- Várias térmicas em vários Chromes: só uma via por job (quem reclamar primeiro).
