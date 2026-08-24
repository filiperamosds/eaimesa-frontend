# ADR-021: Caixa encerra comanda; garçom opcional

**Status:** Aceito  
**Data:** 2026-08-23

## Contexto

No salão, fechar comanda e mesa é operação de **caixa**, não de quem só gera QR e leva pedido. O dono precisa poder impedir o garçom de encerrar contas abertas sem criar um segundo app.

## Decisão

- `venue_members.role`: `staff` (garçom) | `cashier` (caixa). JWT do cookie continua `role: staff` para os dois — não são dono; o perfil vem em `member.role`.
- Caixa usa o mesmo `/garcom` (mesas + fila). Sempre pode `POST /v1/staff/tabs/{id}/close` e `POST /v1/staff/tables/{id}/close`.
- Dono no `/garcom` também sempre pode encerrar.
- Flag do bar `staffCanCloseTabs` (default **true**, para não quebrar o salão atual). Desligada: garçom toma 403 `CASHIER_REQUIRED`; a UI esconde os botões.
- Dono ajusta a flag em **Configurações → Meu bar** (`PATCH /v1/owner/venue`). Cadastra caixa em **Configurações → Equipe** (`role` no POST/PATCH `/v1/owner/staff`).
- Nav do painel: Pedidos | Mesas | Configurações ([ADR-025](ADR-025-responsavel-configuracoes.md)).

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| JWT `role: cashier` separado | Middleware `venue.actor` já trata `staff`; duplicar claims |
| App `/caixa` distinto | Mesma visão do garçom; front único |
| Default `staffCanCloseTabs=false` | Bares sem caixa cadastrado deixam de fechar mesa |

## Consequências

- Endpoints de close **não mudam de path**.
- Callback PIX `/painel/pagamento?checkout=` permanece nessa rota.
