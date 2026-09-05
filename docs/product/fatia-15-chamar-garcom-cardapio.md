# Fatia 15 — Chamar garçom (QR da mesa, plano Cardápio)

Cliente no plano **Cardápio** escaneia o QR **daquela mesa**, ganha uma sessão curta no celular e pode **chamar o garçom**. O dono vê no painel qual mesa chamou. Feature **desligável** e com **TTL configurável**.

Não abre comanda, PIN nem pedido. Ver [ADR-026](../decisions/ADR-026-chamar-garcom-qr-mesa.md).

## Inclui

- QR da mesa: `/{slug}?mesa={menuCode}` no adesivo; após scan o front guarda o código no **sessionStorage** e limpa a URL
- Cookie `eaimesa_presence` após o scan (TTL do estabelecimento)
- Botão **Chamar garçom** no `/{slug}` só com presença válida e feature ligada
- `/painel/chamados` — fila de mesas que chamaram (poll)
- Configurações: ligar/desligar + minutos de validade da sessão (`/painel/configuracoes/chamada`)
- Mesas no plano Cardápio (CRUD em `/painel/configuracoes/mesas`) para exportar QR com `?mesa=`
- Contrato API: [backend-waiter-call.md](../api/backend-waiter-call.md)

## Não inclui

- Pedido / comanda / PIN / claim
- App nativo / push / SSE (poll)
- Staff `/garcom` no plano Cardápio (dono atende em `/painel/chamados`)
- Mapa do salão

## Fluxo

```mermaid
sequenceDiagram
  participant C as Cliente
  participant W as Next
  participant API as Laravel
  participant D as Dono

  C->>W: GET /{slug}?mesa=ab12cd34
  W->>W: sessionStorage + URL sem ?mesa=
  W->>API: POST /v1/public/venues/{slug}/presence { mesa }
  API-->>W: Set-Cookie eaimesa_presence
  C->>W: Chamar garçom
  W->>API: POST /v1/public/waiter-calls
  API-->>W: call open
  D->>API: GET /v1/owner/waiter-calls
  D->>API: PATCH .../acked
```

1. Dono liga **Chamar garçom**, define TTL (ex. 120 min), cadastra mesas, exporta QR **por mesa** (URL com `?mesa=`).
2. Cliente escaneia esse QR (não o QR geral da porta) → presença na mesa → vê o botão.
3. Toca **Chamar garçom** → aparece em `/painel/chamados`.
4. Dono marca **Atendido**. O cardápio poll `GET /v1/public/presence` (~3s); quando `waiterCall` deixa de ser `open`, o botão volta a **Chamar garçom**.
5. Sem scan do QR da mesa (sem código no sessionStorage) ou feature off ou TTL vencido → sem botão (aviso para escanear no salão).

**Front:** o botão não fica restrito ao plano Cardápio — se `waiterCallEnabled=true` no `GET /v1/public/venues/{slug}`, a faixa aparece também no Auto atendimento. Com comanda guest aberta (claim/PIN), a faixa some: a presença do QR fixo é encerrada.

## Configuração (UI)

| Campo | Onde |
|-------|------|
| Ligar / desligar | Configurações → **Chamada** |
| Validade da sessão (minutos) | Mesmo formulário |
| Mesas + QR | Configurações → **Mesas** (`/painel/configuracoes/mesas`) |

## Conferência

- QR Mesa 3 contém `?mesa=` distinto do QR Mesa 4.
- Scan cria cookie; botão aparece.
- Chamada lista a mesa certa no painel.
- **Atendido** no painel → no cardápio o botão volta a **Chamar garçom** (poll da presença).
- Feature off → sem botão / API 403 `FEATURE_DISABLED`.
- TTL baixo → após expirar, botão some até novo scan.
