# ADR-017 — GitHub Actions + FTP Hostinger

## Status

Aceito.

## Contexto

O front é export estático (`output: "export"` → `out/`) e sobe na Hostinger Unlimited. O padrão da agência (ex. `hidrus-frontend-admin`) é GitHub Actions: build no runner e sync FTP.

Staging (`develop`) e produção (`main`) compartilham a conta FTP e diferem pelo diretório (`FTP_SERVER_DIR_DEV` vs `FTP_SERVER_DIR_PRD`).

## Decisão

| Escolha | Por quê |
|---------|---------|
| `develop` → staging, `main` → prod | Mesmo job reutilizável; destinos FTP separados |
| `FTP_SERVER_DIR_DEV` / `FTP_SERVER_DIR_PRD` | Um `public_html` (ou pasta) por ambiente; `dangerous-clean-slate` não mistura os dois |
| URLs de staging: `NEXT_PUBLIC_*` (sem sufixo) | Já configuradas e em uso |
| URLs de prod: `NEXT_PUBLIC_*_PRD` | O HTML do `pnpm build` não pode apontar para `dev.eaimesa.com` |
| FTP (`SamKirkland/FTP-Deploy-Action`), IP sem `ftp://` | Hostinger shared, porta 21 |
| Secrets no GitHub (FTP) + Variables (paths e URLs) | Nada de senha no git |

Contrato: [docs/ops/dev-setup.md](../ops/dev-setup.md). Workflows: `.github/workflows/deploy-develop.yml`, `deploy-main.yml` → `deploy-reusable.yml`.

## Alternativas consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| Git da Hostinger (hPanel) | Simples | Sem `pnpm build`; subiria fonte, não `out/` |
| SFTP porta 65002 | Criptografado | Action FTP já cobre o caso |
| Vercel / Cloudflare Pages | CI nativo | Fora da Hostinger já contratada ([ADR-015](ADR-015-dois-repositorios.md)) |
| Um único `public_html` | Menos variables | Staging e prod se sobrescrevem |

## Consequências

- Branch padrão **`develop`**. PRs (Cursor incluso) mergeiam em `develop`. **`main`** só com PR explícito no GitHub ou pedido para promover a prod.
- Push em `develop` ou `main` dispara o FTP da pasta correspondente.
- Secrets `FTP_SERVER` (IP sem `ftp://`), `FTP_USERNAME`, `FTP_PASSWORD` valem para os dois ambientes.
- No Laravel, `APP_URL` de cada API deve ser a origem do front daquele ambiente (CORS/cookies).
