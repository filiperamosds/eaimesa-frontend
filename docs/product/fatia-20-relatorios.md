# Fatia 20 — Relatórios do estabelecimento

O dono lê o dia (ou a semana) em **Financeiro**, sem abrir comanda por comanda: quanto entrou, o que vendeu, o que cancelou, o que ficou em aberto e se o caixa fechou batido.

A nav de cima não muda (Pedidos · Mesas · Chamados · Caixa · Financeiro). Configuração (taxa, exigir caixa) continua em **Configurações → Financeiro**. O turno ao vivo continua em **Caixa**.

Spec: [ADR-036](../decisions/ADR-036-relatorios-estabelecimento.md).

## Inclui

### Nav interna em `/painel/financeiro`

| Aba | Rota | Conteúdo |
|-----|------|----------|
| **Faturamento** | `/painel/financeiro` | Relatório de dinheiro que já existia + série por dia + vendas por mesa |
| **Relatórios** | `/painel/financeiro/relatorios` | Operação + listas |

Período **De / Até** compartilhado (query `from`/`to`). Atalhos: hoje, ontem, 7 dias, 30 dias. Só dono; módulo `finance`; Auto atendimento.

### Faturamento

- KPIs: recebido, **líquido** (recebido − cortesia), cortesia, descontos, taxa de serviço, comandas, ticket médio, itens
- Formas de pagamento; taxa por quem abriu a mesa ([ADR-032](../decisions/ADR-032-taxa-garcom-mesa.md))
- **Série por dia** e **por mesa**
- Export CSV dos recebimentos

### Relatórios

1. **Dashboard operacional** — pedidos × cancelados, origem QR vs garçom, ocupações; vs período anterior; **pico por hora** (Brasília). Cortesia e desconto no Faturamento.
2. **Pedidos** — histórico (não o Kanban de 48 h).
3. **Comandas** — fechamentos com saldo, desconto e formas.
4. **Itens e categorias**
5. **Turnos de caixa** — esperado × conferido, quebra, sangria.
6. **Equipe** — taxa de quem abriu a mesa.

## Não inclui

- Contas a pagar, DRE, estoque, NFC-e, conciliação de maquininha
- Tempo médio pedido → saiu
- PDF / e-mail agendado
- Relatório no garçom ou no Painel
- Comparar dois estabelecimentos

## Fluxo

1. Dono abre **Financeiro**. Vê Faturamento do período (últimos 30 dias por padrão).
2. Troca para **Relatórios**: capa operacional; entra em Pedidos / Comandas / Itens / Caixa / Equipe.
3. Muda **De / Até** (ou atalho 7 dias) e navega — o período permanece na URL.
4. Exporta CSV do recorte.

Ver [ADR-036](../decisions/ADR-036-relatorios-estabelecimento.md).
