# ADR-029: Cupom de conferência via ESC/POS (USB/serial)

**Status:** Aceito  
**Data:** 2026-08-27  
**Depende de:** [fatia 6](../product/fatia-06-comandas-individuais.md)

## Contexto

**Imprimir** no cupom usava o diálogo do Chrome (`window.print()`). Na POS80 o preview nasce em **A4** e o CUPS do Mac converte o PDF com `cgpdftops`. A térmica não fala PostScript: imprime `%!PS-Adobe-3.0` no papel. `@page { size: 80mm }` não muda o tamanho que o driver declara.

O **agente local** de cozinha continua fora do MVP ([visão](../product/visao.md)).

## Decisão

- **Imprimir na térmica** (cupom da comanda) e a **via do Kanban** enviam bytes ESC/POS (CP850, 48 colunas, corte) por **WebUSB** ou **WebSerial** no Chrome. Não abre janela nem caixa A4.
- Primeira vez: o Chrome lista o dispositivo USB. Depois reusa a permissão.
- Kanban: ligar em **Configurações → Estabelecimento**. O card **Imprimir pedidos novos na térmica** tem **Configurar impressora** (picker USB/serial deste Chrome, sem salvar o resto do formulário). Pedidos `pending` que chegarem no poll saem sozinhos neste Chrome. Pedidos que já estavam na fila não reimprimem. Monitor Painel imprime só os itens da estação (ou os **grupos** se `printViaGroups`). Cada card ainda tem **Imprimir**. Grupos de impressão: [ADR-035](ADR-035-grupos-impressao.md).
- Se o sistema já tiver a POS80 na fila de impressão, o USB fica ocupado — o usuário pausa/remove essa impressora em Ajustes.
- **Impressora do sistema** permanece para laser/PDF no cupom da comanda.

## Alternativas consideradas

| Opção | Por que não |
|-------|-------------|
| Só CSS `@page` 80 mm | Chrome ignora e usa o papel do driver (A4) |
| PDF 80 mm + print | CUPS ainda gera PostScript na POS80 |
| Agente local (QZ / fila ESC/POS) | Fora do MVP; outro binário no caixa |

## Consequências

- Chrome (HTTPS ou localhost). Safari/Firefox sem WebUSB: mensagem para usar Chrome.
- Agente local de cozinha (job `print_pending`) continua fora do MVP.
