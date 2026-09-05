# Fatia 25 — Modo escuro do cardápio

O dono escolhe se o cardápio público (`/{slug}`) aparece claro ou escuro.

## Inclui

- `venues.catalog_dark` / API `catalogDark` (default `false`)
- Configurações → Cardápio: interruptor na mesma linha do título **Cardápio**, acima de Adicionar categoria. Rótulo **Claro** / **Escuro**
- `GET /v1/public/venues/{slug}` devolve `catalogDark`; o front aplica o tema na página pública

## Não inclui

- Tema do painel, do garçom ou do `/admin`
- Preferência por aparelho do cliente (o tema é do estabelecimento)

Ver [fatia 1](fatia-01-cardapio.md).
