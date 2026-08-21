# Fatia 10 — Planos (Cardápio e Auto atendimento)

O produto deixa de ser um único “Plano Bar”. O estabelecimento escolhe o que compra. **Equipamento na mesa** fica documentado, sem venda.

SKUs extras, `kind` e preço promocional: [fatia 11](fatia-11-console-saas.md) e [ADR-014](../decisions/ADR-014-plan-kind-promo.md).

## Inclui

- Planos vendáveis: **Cardápio** (R$ 49/mês) e **Auto atendimento** (R$ 149/mês)
- Cadastro escolhe o plano; **trial de 7 dias**; cobrança depois
- Landing e `/preco`: **dois cards** com nome, valor, o que inclui e CTA
- Cadastro mostra o **preço** do plano escolhido
- Painel `/painel/pagamento`: formulário de **cartão ou PIX** no modo stub (só UI; não envia PAN)
- `POST /v1/billing/checkout` — stub (`checkoutMode=immediate`): espera **2s** e devolve `status: success`. Gateway Asaas: [fatia 12](fatia-12-pagamento-asaas.md)
- Upgrade Cardápio → Auto atendimento a qualquer momento (checkout)
- Downgrade Auto atendimento → Cardápio **só depois do fim da vigência paga**
- Gates na API e no painel: Cardápio não acessa mesas, equipe, garçom, pedido, Kanban
- `/{slug}` no plano Cardápio: só leitura — sem “Entrar para pedir”, faixa de PIN ou carrinho
- `/{slug}/entrar`, `/comanda`, `/bem-vindo` e claim redirecionam ao cardápio se o plano não tem pedido
- Seed: Bar do Tião (Auto atendimento) + Café da Lina (Cardápio)

## Não inclui

- Gateway real nesta fatia (Asaas: [fatia 12](fatia-12-pagamento-asaas.md))
- Plano **Equipamento na mesa** (só spec / card “em breve”)
- Prorrata, nota fiscal, cupom

## O que cada plano libera

| Recurso | Cardápio | Auto atendimento | Equipamento (futuro) |
|---------|----------|------------------|----------------------|
| `/{slug}` leitura + CRUD cardápio + QR | sim | sim | sim |
| Mesas, equipe, `/garcom`, claim/PIN | não | sim | sim |
| Pedido no celular, parcial, Kanban, balcão | não | sim | sim |
| Hardware/tablet na mesa | não | não | sim |

## Fluxo

1. Landing → Adquirir Cardápio ou Auto atendimento → `/cadastro?plano=…`
2. Cria a conta em `trial` (7 dias) naquele plano.
3. Depois do trial (ou antes, se quiser pagar): `/painel/pagamento` — vê o valor, escolhe cartão ou PIX. No stub (~2s) vira `active` por 30 dias. No Asaas: [fatia 12](fatia-12-pagamento-asaas.md).
4. Sem pagar após o trial: recursos do plano ficam bloqueados (`BILLING_INACTIVE`); o cardápio público continua leitura.

Ver [pricing](pricing.md) e [ADR-012](../decisions/ADR-012-planos.md).
