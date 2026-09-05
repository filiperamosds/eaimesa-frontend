# ADR-036: Relatórios do estabelecimento

**Status:** Aceito  
**Data:** 2026-09-01  
**Depende de:** [ADR-032](ADR-032-taxa-garcom-mesa.md)

## Contexto

`/painel/financeiro` já mostra faturamento. Faltava histórico de pedidos, comandas com saldo e uma capa operacional. A nav principal do painel já está cheia.

## Decisão

1. Nav interna em `/painel/financeiro`: **Faturamento** e **Relatórios**.
2. Período `from`/`to` na query string (data ou data+hora em Brasília), compartilhado entre as abas.
3. Faturamento mostra série por dia e vendas por mesa (`GET /v1/owner/finance/summary`).
4. Relatórios em `/v1/owner/reports/*`. O Kanban (`GET /v1/owner/orders`) continua 48 h + caixa.
5. Turnos ao vivo permanecem em `/painel/caixa`; Relatórios lista `GET /v1/owner/cash-sessions`.
6. Só dono + módulo `finance`. Sem DRE, NFC-e, PDF, trilha de preparo.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Novo item na nav de cima | Relatórios é leitura do financeiro |
| Um scroll único | Ruim no tablet |
| Reusar o GET do Kanban | Recorte de 48 h / caixa, não histórico |

## Consequências

- Front: `/painel/financeiro` + `/painel/financeiro/relatorios/*`.
- Faturamento: `soldCents` = devido nas comandas fechadas; `grossCents` = pago; `netCents` = recebido − cortesia; desconto à parte (já saiu do devido).
- Relatórios: `byHour` no overview, horário de Brasília.
- Contrato: [endpoints.md](../api/endpoints.md). Produto: [fatia 20](../product/fatia-20-relatorios.md).
