# ADR-037: Estoque, receita e alerta

**Status:** Aceito  
**Data:** 2026-09-02  
**Depende de:** [ADR-029](ADR-029-modulos-por-plano.md), [ADR-005](ADR-005-kanban-pedidos.md)

## Contexto

O estabelecimento precisa saber se o insumo vai acabar. O cardápio vende **pratos**; o estoque é de **ingredientes**. Um risoto não é um saco de arroz: a ficha diz 100 g de arroz e 100 g de carne, e o saldo vive nessa unidade.

## Decisão

1. Módulo de uso `inventory` no plano Auto atendimento. Só o dono cadastra e vê alerta.
2. Insumo (`stock_items`): nome, unidade canônica `g` | `ml` | `un`, `quantity` inteiro nessa unidade, `alert_quantity` opcional. Pacote (2 × 1 kg) é atalho de entrada, não lote.
3. Receita (`catalog_item_recipes`): por item do cardápio, linhas `{ stock_item_id, qty }` na unidade do insumo, para **1** unidade vendida. Pedido com `qty` 2 escala ×2.
4. Movimentos append-only (`stock_movements`): `in`, `adjust`, `sale`, `sale_void`. Saldo do insumo é denormalizado. Baixa na criação do pedido; cancelar gera `sale_void` com o que foi baixado (não a receita atual).
5. Saldo pode ficar negativo. Pedido **nunca** é recusado por falta de estoque.
6. Alerta: `quantity <= alert_quantity` quando o alerta não é null. Sem alerta cadastrado, sem banner.

## Alternativas rejeitadas

| Opção | Por quê não |
|-------|-------------|
| Estoque no próprio `catalog_items` | Prato ≠ insumo (risoto usa arroz + carne) |
| Unidade livre (kg, L) no banco | Conversão confusa; UI formata 2000 g → 2 kg |
| Baixa só em `delivered` | Pedido na fila já comprometeu o insumo |
| Bloquear venda | O salão continua servindo; o dono precisa do aviso, não do 409 |
| Estoque na nav principal do Painel | Cadastro de insumo é configuração; o alerta do dia fica no banner de Pedidos |

## Consequências

- Front: **Configurações → Estoque** (`/painel/configuracoes/estoque`; `/painel/estoque` redireciona). Receita no dialog de editar o item do cardápio, no mesmo Salvar que foto e detalhes. Banner em Pedidos.
- Contrato: [endpoints.md](../api/endpoints.md). Produto: [fatia 21](../product/fatia-21-estoque.md).
- Seed demo: Risoto + arroz 2000 g + carne 1500 g.
