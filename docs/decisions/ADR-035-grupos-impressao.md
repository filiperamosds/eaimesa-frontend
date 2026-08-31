# ADR-035: Grupos de impressão (uma térmica, várias vias)

**Status:** Aceito  
**Data:** 2026-08-31  
**Depende de:** [ADR-029](ADR-029-cupom-escpos-usb.md), [ADR-024](ADR-024-kanban-painel-categorias.md)

## Contexto

Cozinha e bar costumam ser estações diferentes, mas muitos bares têm **uma** POS80. A via única do Kanban (pedido inteiro + um corte) mistura prato e drink no mesmo papel. O dono precisa de **vias físicas separadas** sem um segundo aparelho nem um segundo login Painel.

O perfil Painel (Kanban por categoria) já filtra a tela. Quem imprime no Kanban do **dono** (e no do garçom) vê o pedido completo.

## Decisão

- Grupos de impressão pertencem ao **estabelecimento** (`venue_print_groups` + categorias). Ex.: Cozinha → Petiscos e Porções; Drinks → Drinks; Bebidas → Bebidas.
- Uma categoria **pode** entrar em mais de um grupo (via duplicada). Item que não cai em nenhum grupo sai numa via **Outros**.
- No Kanban que **não** é usuário Painel (dono e garçom/caixa): se houver grupos, cada pedido gera **uma via por grupo com itens**, com **guilhotina** ESC/POS entre elas (`GS V A`). Sem grupos, permanece a via única.
- Usuário **Painel**: imprime só os itens da estação, numa via — salvo **Imprimir via grupos** no cadastro da equipe (`printViaGroups`). Aí aplica os mesmos grupos do estabelecimento sobre os itens visíveis.
- A configuração vive em **Configurações → Estabelecimento**. Equipe só liga/desliga o modo no perfil Painel.
- O corte continua no Chrome USB/serial (ADR-029). Agente local segue fora do MVP.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Um grupo = um login Painel | Resolve a tela, não o papel quando só há uma térmica |
| Status/via por item | Mudança grande; o pedido do salão continua um só |
| Grupo no JWT / por máquina | A térmica é do Chrome; o recorte é do cardápio |

## Consequências

- `GET`/`PUT /v1/owner/print-groups`; `printGroups` no venue serializado (`auth/me`, `GET /v1/owner/venue`).
- Equipe: `printViaGroups` no POST/PATCH `/v1/owner/staff` e em `member` no login/`me`.
- Front: splitter em `packages/shared`; encoder ESC/POS emite N tickets com corte.
