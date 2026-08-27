# ADR-005: Kanban na fila de pedidos

**Status:** Aceito  
**Data:** 2026-08-18  
**Atualizado:** 2026-08-27

## Contexto

A fatia 2 precisa de uma tela de pedidos para o estabelecimento. Duas opções naturais: lista cronológica (estilo chat de tickets) ou board Kanban (KDS).

## Decisão

Board **Kanban** em `/painel/pedidos`, uma coluna por status ativo (`pending`, `preparing`, `delivered`, `cancelled`).

- Avanço de status por **botão** no card (Preparar / Entregar).
- Arrastar entre colunas **não** é o caminho primário (toque em tablet/celular de bar).
- Não há coluna Aceitos. `accepted` permanece no contrato HTTP e no banco; no board cai em Preparando.
- Cancelados ocupam a última coluna (sem avanço nem novo cancelamento).

## Alternativas

| Opção | Por que não agora |
|-------|-------------------|
| Lista única + filtro | Esconde quantos estão parados em cada etapa |
| Drag-and-drop como único gesto | Ruim com as mãos molhadas / tela pequena |
| Uma tela “só novos” | Não cobre o ciclo até entregar |
| Coluna Aceitos | Etapa extra sem uso no salão; Preparar a partir de Novos basta |

## Consequências

- Login do dono abre `/painel/pedidos`.
- `/painel` redireciona para o Kanban (não mais para o cardápio).
- Abas no topo do painel: Pedidos | Cardápio | Mesas | Meu bar (Mesas: [ADR-006](ADR-006-mesas.md)).
- Polling curto até existir SSE.
- Pedido do cliente no slug público continua **fora** desta fatia.
