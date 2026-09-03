# ADR-039 — Identidade visual no front

**Status:** Aceito  
**Data:** 2026-09-03  
**Depende de:** [ADR-003](ADR-003-frontend-unico.md)

## Contexto

A marca tinha um símbolo provisório (elipse + copo) e uma paleta próxima (`#E23C14` / `#F6F0E7`). A prancha oficial define chili `#D84A2B`, paper `#F9F4EC`, ink `#1E1B18`, o balão com cloche e o slogan Auto atendimento.

## Decisão

1. Tokens CSS e `lib/brand.ts` passam a usar a paleta da prancha.
2. Títulos e wordmark: Playfair Display; UI permanece Outfit.
3. Símbolo em SVG (não o recorte raster da prancha) para favicon, header e rodapé.
4. Recortes da prancha ficam em `docs/brand/exports/` como referência; o site serve `public/brand/*` gerado na mesma geometria.
5. Slogan **AUTO ATENDIMENTO** no lockup de marketing (landing, auth, rodapé). Headers do painel, garçom e console ficam compactos, sem slogan — o produto também vende o plano Cardápio.

## Alternativas

| Opção | Por que não |
|-------|-------------|
| Usar só os PNG recortados da prancha | A arte composta tem ~120 px por ícone; estica no header e no favicon |
| Slogan em todo header autenticado | O plano Cardápio não é auto atendimento; o nav já é apertado no mobile |

## Consequências

- Spec: [identidade visual](../architecture/identidade.md)
- QR gerado no painel (adesivo do cardápio / claim) usa ink/paper da paleta
