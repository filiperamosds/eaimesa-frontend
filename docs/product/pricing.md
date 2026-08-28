# Pricing

Mensalidade fixa; **sem comissão** sobre consumo. Trial e vigência (default **7** e **30** dias) vêm de `platform_settings`. Preço e copy da vitrine vêm de `plan_catalog` (editáveis em `/admin/planos`). O operador pode **criar SKUs** novos: cada um tem `kind` (`cardapio` | `auto_atendimento`) e, opcionalmente, `promo_price_cents`. Se a promo estiver preenchida e for menor que o preço cheio, landing, cadastro e checkout mostram **de R$ X por R$ Y** e a cobrança usa o valor da promo.

Checkout: `GET /v1/billing/plans` → `gateway`. Stub (`immediate`) devolve sucesso após ~2s. Cartão Asaas é digitado no painel (ou reusa o salvo) e enviado à API. PIX Asaas redireciona; renovação PIX pede um novo pagamento. Landing e cadastro **não** pedem pagador.

## Planos vendáveis

O catálogo não está mais limitado a dois ids. Os seed:

| | **Cardápio** (`kind=cardapio`) | **Auto atendimento** (`kind=auto_atendimento`) |
|--|--------------|----------------------|
| Mensal (cheio) | **R$ 49/mês** | **R$ 149/mês** |
| Promo | opcional (`promo_price_cents`) | opcional |
| Cardápio público + QR | Sim | Sim |
| Mesas (QR / adesivo) | Sim (até **15**; chamada ao garçom opcional — [fatia 15](fatia-15-chamar-garcom-cardapio.md)) | Até **15** |
| Chamar garçom (presença na mesa) | Opcional (config) | Opcional / futuro no `/garcom` |
| Pedido no celular / comanda / Kanban | Não | Sim |
| Staff | — | Até **5** |
| Pedidos | — | Ilimitados |
| Térmica | Não | Não |

SKUs extras no `/admin/planos` herdam o que o `kind` libera. Máximo **12** planos. Sem DELETE: unlist esconde da vitrine.

Vigência paga: **30 dias** a partir do **fim da cobertura atual** (trial ou mês já pago), não a partir do instante do pagamento. Pagar 3 dias antes do trial acabar → `trial_ends_at + 30`. Renovar 5 dias antes do vencimento → `current_period_ends_at + 30`. Se já venceu → `agora + 30`. Sem tabela de ciclos. Stub na hora; Asaas no webhook. [ADR-019](../decisions/ADR-019-vigencia-empilhada.md).

## Em breve (não vender agora)

**Equipamento na mesa** — tablet/hardware no salão. Sem preço e sem CTA de compra.

## Troca de plano

- **Subir** (`kind` Cardápio → Auto atendimento): a qualquer momento, via checkout. 1ª cobrança = preço efetivo **menos** crédito dos dias restantes (`upgradeQuotes`).
- **Trocar** SKUs do mesmo `kind`: a qualquer momento.
- **Descer** (Auto atendimento → Cardápio): no meio da vigência paga, **agendar** para o fim do período. No trial, pode trocar na hora.
- **Mesmo plano `active`**: não re-cobrar; gerenciar cartão.
- **Cancelar**: para as próximas cobranças; o sistema segue até o fim da vigência paga. Sem reembolso do mês atual.

## Early adopters / anual

Fora desta fatia (o “Plano Bar” único e o desconto de R$ 119 saem).

## Setup

- **R$ 0** self-serve no trial. O painel destaca o checkout nos últimos 3 dias (`TRIAL_ENDING_SOON_DAYS`) ou se o status for `past_due`.
- **R$ 150** opcional: cadastro assistido do cardápio (comercial; não está no app).

## O que não cobrar

- Percentual sobre consumo
- Taxa por pedido
- Gateway de cartão no EaiMesa (PAN em trânsito até o Asaas; token salvo, não o número)

## Referência de mercado (2026)

- Cardápio QR básico: ~R$ 20–100/mês
- Comanda self-service: ~R$ 150–199/mês

EaiMesa: **Cardápio** na faixa QR; **Auto atendimento** na faixa de comanda confiável.
