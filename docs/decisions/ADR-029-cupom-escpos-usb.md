# ADR-029: Cupom de conferência via ESC/POS (USB/serial)

**Status:** Aceito  
**Data:** 2026-08-27  
**Depende de:** [fatia 6](../product/fatia-06-comandas-individuais.md)

## Contexto

**Imprimir** no cupom usava o diálogo do Chrome (`window.print()`). Na POS80 o preview nasce em **A4** e o CUPS do Mac converte o PDF com `cgpdftops`. A térmica não fala PostScript: imprime `%!PS-Adobe-3.0` no papel. `@page { size: 80mm }` não muda o tamanho que o driver declara.

O **agente local** de cozinha continua fora do MVP ([visão](../product/visao.md)).

## Decisão

- **Imprimir na térmica** envia bytes ESC/POS (CP850, 48 colunas, corte) por **WebUSB** ou **WebSerial** no Chrome. Não abre janela nem caixa A4.
- Primeira vez: o Chrome lista o dispositivo USB. Depois reusa a permissão.
- Se o sistema já tiver a POS80 na fila de impressão, o USB fica ocupado — o usuário pausa/remove essa impressora em Ajustes.
- **Impressora do sistema** permanece para laser/PDF.

## Alternativas consideradas

| Opção | Por que não |
|-------|-------------|
| Só CSS `@page` 80 mm | Chrome ignora e usa o papel do driver (A4) |
| PDF 80 mm + print | CUPS ainda gera PostScript na POS80 |
| Agente local (QZ / fila ESC/POS) | Fora do MVP; outro binário no caixa |

## Consequências

- Chrome (HTTPS ou localhost). Safari/Firefox sem WebUSB: mensagem para usar Chrome.
- Não é auto-print da cozinha.
