# Fatia 22 — Fila de cupom no Kanban

O garçom no celular manda imprimir a comanda; o Kanban que tem a POS80 USB imprime o cupom. Sem agente local.

## Inclui

- `print_jobs` (`tab_receipt`)
- Celular sem térmica: **Imprimir no Kanban** enfileira
- Chrome com USB já autorizado: imprime na hora
- Kanban aberto com térmica: consome a fila no poll (junto com as vias de pedido)
- Toque duplo na mesma comanda não gera duas vias enquanto o job está `pending`/`printing`

## Não inclui

- Várias impressoras / escolher qual Kanban
- Agente local (`print_pending`)
- Reimpressão automática de job `failed` (garçom toca de novo)

## Fluxo

1. Garçom abre o cupom da comanda no celular e toca **Imprimir**.
2. Sem USB neste aparelho → `POST /v1/staff/tabs/{id}/print`.
3. Tablet/caixa com Kanban e POS80 autorizada reclama o job e manda ESC/POS.
4. `PATCH { status: "printed" }`.

Ver [ADR-041](../decisions/ADR-041-fila-cupom-kanban.md).
