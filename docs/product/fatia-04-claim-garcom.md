# Fatia 4 — Claim do garçom + equipe

O garçom abre a comanda na mesa. O dono cadastra usuários de **garçom** no painel. No celular, o garçom escolhe a mesa e gera o **QR de claim** (TTL, uso único). O cliente escaneia → tab + PIN + cookie guest. **Ainda sem pedido pelo cardápio** (fatia 6).

## Inclui

- CRUD de equipe em `/painel/bar/equipe` (dono) — cria `account` + `venue_member` com `role` `staff` (garçom) ou `cashier` (caixa)
- **Login único** em `/login` — cookie `eaimesa_owner` com JWT `role: owner | staff` (`member.role` distingue caixa)
- App `/garcom` — grade de mesas, gera QR; caixa e dono sempre encerram contas; garçom conforme `staffCanCloseTabs`
- API `POST /v1/staff/tables/{id}/claims` (staff ou dono)
- Redeem `POST /v1/public/venues/{slug}/c/{token}/redeem` → tab + PIN + cookie `eaimesa_guest`
- Página `/{slug}/c/{token}` no front (redeem) e `/{slug}/bem-vindo` (PIN grande)
- Limite: **5 garçons ativos** por venue (plano Bar)
- Seed: `garcom@bardotiao.local` / senha demo

## Dois QRs (recapitulando)

| QR | Quem gera | Destino | Abre comanda? |
|----|-----------|---------|---------------|
| Fixo da mesa | Dono (export) | `/{slug}` | Não |
| Garçom (claim) | Garçom ou dono no painel | `/{slug}/c/{token}` | Sim |

## Não inclui

- Pedido guest pelo cardápio (`POST /guest/orders`) — fatia 6
- PIN join em outro aparelho (`POST /guest/tabs/join`) — [fatia 5](fatia-05-pin-join.md)
- Fechar / travar tab
- Impressora, SSE

Ver [ADR-002](../decisions/ADR-002-claim-garcom.md), [ADR-007](../decisions/ADR-007-staff-garcom.md), [sessão claim + PIN](../architecture/sessao-claim-pin.md).

## Fluxo garçom

1. Dono cadastra garçom ou caixa (nome, e-mail, senha, perfil) em **Meu bar → Equipe**.
2. A pessoa entra em **`/login`** (mesmo do painel) → redireciona para `/garcom`.
3. Toca a mesa → dialog. **Novo QR** mostra o código + **PIN** para passar ao cliente. O claim já abre a sessão da mesa.
4. Cliente escaneia → PIN (o mesmo) → cardápio (pedir na fatia 6). Outro aparelho: PIN em `/{slug}/entrar`.

## Fluxo dono

O dono continua com Kanban, cardápio e mesas. Também pode gerar claim (mesma API) enquanto não houver login staff separado no turno.
