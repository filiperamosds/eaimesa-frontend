# Fatia 21 — Estoque e receita

O dono cadastra **insumos** (arroz, carne), informa quanto tem e um **alerta** de quantidade. Em cada item do cardápio, a **receita** diz quanto aquele prato usa. Ao lançar o pedido (QR ou garçom), o saldo baixa; se cancelar, o saldo volta. Venda **não** trava se faltar estoque — o alerta avisa.

Exemplo: risoto usa 100 g de arroz e 100 g de carne. Dois pacotes de 1 kg de arroz entram como **2000 g**. Um risoto desconta 100 g de cada.

Spec: [ADR-037](../decisions/ADR-037-estoque.md). Módulo `inventory` no plano Auto atendimento.

## Inclui

- Cadastro de insumos em **Configurações → Estoque** (`/painel/configuracoes/estoque`): nome, unidade canônica (`g` | `ml` | `un`), saldo, alerta. `/painel/estoque` redireciona para cá.
- Entrada por **pacotes** (2 × 1000 g) ou quantidade já na unidade
- Receita no item do cardápio (Configurações → Cardápio → **Editar**): no mesmo dialog de foto e detalhes, linhas `{ insumo, quantidade por 1 unidade do prato }`; um único **Salvar**
- Baixa na **criação** do pedido (`pending`); estorno se o status for `cancelled`
- Banner de alerta quando `quantity <= alertQuantity` (e o alerta está preenchido)
- API `GET/POST/PATCH/DELETE /v1/owner/stock/items`, movimentos, receitas; gate `module:inventory`

## Não inclui

- Fornecedor, NF de compra, lote, validade, multi-depósito
- Custo / CMV / DRE (financeiro continua só recebimento)
- Bloquear pedido sem estoque
- Produção, ficha com rendimento, desperdício como tipo separado (ajuste cobre)
- Contas a pagar
- Estoque no garçom ou no cardápio público

## Fluxo

1. Dono abre **Configurações → Estoque**, cadastra Arroz (`g`), entra 2 pacotes de 1000 g, alerta 400 g.
2. No cardápio, **Editar** no Risoto: receita 100 g arroz + 100 g carne (mesmo Salvar da foto e dos detalhes).
3. Cliente pede 1 risoto → arroz 2000 → 1900; carne idem.
4. Saldo ≤ alerta → banner no Estoque e em Pedidos.
5. Pedido cancelado → quantidades voltam.

Ver [ADR-037](../decisions/ADR-037-estoque.md).
