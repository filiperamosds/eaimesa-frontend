# Identidade visual

Fonte: prancha em [identidade-origem.png](../brand/identidade-origem.png). Recortes da prancha em [exports/](../brand/exports/). No site, o símbolo é SVG (`components/logo-mark.tsx` e `public/brand/mark.svg`) — os recortes da prancha são referência; a resolução da arte composta não serve de favicon.

## Paleta

| Token | Hex | Uso |
|-------|-----|-----|
| Principal (`chili`) | `#D84A2B` | Marca, botão primário, destaques |
| Secundária (`chili-dark`) | `#B8391E` | Hover do primário |
| Fundo (`paper`) | `#F9F4EC` | Fundo da página, cloche no símbolo colorido |
| Texto (`ink` / `night`) | `#1E1B18` | Texto, rodapé, cloche na variante inversa |

Constantes TS: `lib/brand.ts` (QR e canvas). Tokens CSS: `app/globals.css` (`@theme`).

## Tipo

| Papel | Família |
|-------|---------|
| Wordmark e títulos | **Playfair Display** (`font-serif`) |
| UI, slogan, corpo | **Outfit** (`font-sans`) |

Slogan da marca: **AUTO ATENDIMENTO** (versalete, tracking largo, traços laterais). No header compacto do painel/garçom/admin o slogan some; na landing, login, cadastro e rodapé ele aparece.

## Símbolo

Balão de fala com silhueta de cloche (rechaud) e três raios no canto superior direito (notificação / “está pronto”).

| Variante | Balão | Cloche | Onde |
|----------|-------|--------|------|
| `brand` | chili | paper | Fundo claro |
| `inverse` | paper | ink | Fundo night ou círculo chili (favicon) |

Ícones de app (512): `public/brand/icon-app.png` (chili), `icon-app-light.png`, `icon-app-dark.png`. Favicon: `public/logo.svg`, `favicon-32.png`, `apple-touch-icon.png`.

## Superfícies

- Landing `/`: lockup no header; mock de celular com QR (`public/brand/qr-landing.png`) e faixa chili com o slogan de campanha.
- Auth e rodapé: lockup com slogan.
- Cardápio público: símbolo pequeno no rodapé “Cardápio por EaiMesa”.
