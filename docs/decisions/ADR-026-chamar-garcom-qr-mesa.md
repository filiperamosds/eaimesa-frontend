# ADR-026: Chamar garçom via QR da mesa (plano Cardápio)

**Status:** Proposto  
**Data:** 2026-08-24  
**Depende de:** backend Laravel (contrato em [backend-waiter-call.md](../api/backend-waiter-call.md))

## Contexto

No plano **Cardápio** o cliente só lê o menu. O QR fixo de cada mesa hoje aponta para o **mesmo** `/{slug}` — o adesivo imprime o rótulo, mas o aparelho não sabe em qual mesa está. O dono quer:

1. QR da mesa com identificação na URL
2. Sessão curta no celular após o scan
3. Botão **Chamar garçom** (só com sessão válida)
4. Tela no painel listando qual mesa chamou
5. TTL configurável e feature desligável nas Configurações

Isso **não** é comanda nem pedido (ADR-002 permanece): o QR fixo continua sem abrir tab/PIN.

## Decisão

### URL do QR da mesa

```
https://eaimesa.com.br/{slug}?mesa={menuCode}
```

- `menuCode`: código opaco curto por mesa (ex. 8 chars URL-safe), **não** o UUID interno.
- Querystring no **QR** (não hash): na 1ª abertura o front lê `?mesa=`, grava em `sessionStorage` (por slug) e **remove** o parâmetro da barra de endereço (`history.replaceState`). Evita compartilhar link com código da mesa.
- QR geral (porta/Instagram) continua `/{slug}` **sem** `?mesa=` — sem presença, sem botão de chamar.

### Sessão de presença

- Cookie httpOnly separado: `eaimesa_presence` (≠ `eaimesa_guest` da comanda).
- Escopo: `venue_id` + `table_id` + expiração.
- TTL = `venues.waiter_call_ttl_minutes` (configurável; default sugerido **120**).
- Sliding opcional no MVP: **não** — só TTL absoluto desde o redeem/scan.
- Sem nome/telefone.

### Configuração (dono)

Em Configurações (plano Cardápio e, se ligado, Auto atendimento):

| Campo | Tipo | Default |
|-------|------|---------|
| `waiterCallEnabled` | bool | `false` |
| `waiterCallTtlMinutes` | int 15–480 | `120` |

Desligado: QR ainda pode ter `?mesa=` (rótulo útil), mas a API não cria presença e o botão não aparece.

### Mesas no plano Cardápio

Liberar CRUD de mesas (`GET/POST/PATCH/DELETE /v1/owner/tables`) no `kind=cardapio` — sem claim, staff, Kanban ou pedido. Limite: **15** ativas. Front: **Configurações → Mesas** (e **Chamada** para ligar/desligar + TTL) nos dois planos.

### Chamada

1. Cliente com presença válida toca **Chamar garçom**.
2. `POST` cria `WaiterCall` (`open`) com mesa + timestamp; rate limit por presença.
3. Dono (e depois staff, se houver) vê em **`/painel/chamados`** (poll curto).
4. **Atendido** → `acked`; lista some dos abertos.
5. Chamada órfã (presença expirou) pode permanecer até ack ou TTL da própria call (ex. 30 min).

### Quem atende no Cardápio

Sem equipe no plano Cardápio: a tela é do **dono** em `/painel/chamados` (celular no salão com login). Auto atendimento pode reutilizar a mesma fila no `/garcom` numa fatia seguinte — fora do MVP desta decisão.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Hash `#mesa=` | Não chega ao servidor; sessão só no `localStorage` é fácil de forjar e não escala para a fila do painel |
| Reusar `eaimesa_guest` / claim | Mistura comanda; claim é uso único + TTL curto |
| Só rótulo impresso no PNG, sem query | Aparelho não sabe a mesa → não dá para filtrar chamados |
| WebSocket obrigatório | Poll no painel basta (padrão Kanban) |

## Consequências

- Front: `publicMenuUrl(slug, { mesa })` no QR; cardápio bootstrap `?mesa=` → `sessionStorage` + URL limpa; Configurações + `/painel/chamados`.
- Backend: ver [backend-waiter-call.md](../api/backend-waiter-call.md).
- Docs de pricing/fatia 3: Cardápio passa a ter mesas (QR) se a feature estiver no produto.
- Claim / Auto atendimento **inalterados**.
