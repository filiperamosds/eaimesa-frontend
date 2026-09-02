# Fatia 19 — Grupos de impressão

Uma térmica, várias vias: o dono agrupa categorias do cardápio (Cozinha, Drinks, Bebidas). Quando o pedido chega no Kanban que **não** é usuário Painel, a POS80 imprime um grupo, **corta**, imprime o próximo, corta de novo.

## Inclui

- CRUD dos grupos em **Configurações → Estabelecimento** (nome + categorias)
- Persistência no venue (`GET`/`PUT /v1/owner/print-groups`; `printGroups` no venue)
- Kanban do dono e `/garcom/pedidos`: via por grupo + guilhotina ESC/POS ([ADR-029](../decisions/ADR-029-cupom-escpos-usb.md))
- Perfil **Painel**: opção **Imprimir via grupos** no cadastro da equipe (`printViaGroups`). Ligar o flag **trava** o checklist de categorias (todas marcadas). Sem a opção, a estação continua com uma via só dos itens dela
- Item sem grupo → via **Outros**. Categoria em dois grupos → duas vias

## Não inclui

- Várias impressoras / fila por IP
- Agente local (`print_pending`)
- Status por item
- Grupo por mesa ou por operador (exceto o flag do Painel)

## Fluxo

1. Dono abre Estabelecimento e cria grupos: Cozinha (Petiscos, Porções), Drinks (Drinks), Bebidas (Bebidas).
2. Liga **Imprimir pedidos novos na térmica** neste Chrome.
3. Pedido misto (porção + caipirinha + chopp) chega no Kanban do dono → três papéis, cada um com o nome do grupo no topo.
4. Tablet da Cozinha (Painel) sem o flag: uma via só de comida. Com **Imprimir via grupos**: categorias travadas; a térmica aplica os grupos do estabelecimento.

Ver [ADR-035](../decisions/ADR-035-grupos-impressao.md).
