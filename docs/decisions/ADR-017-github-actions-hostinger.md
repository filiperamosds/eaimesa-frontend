# ADR-017 — GitHub Actions + Hostinger (front)

## Status

Aceito. **Transporte FTP supersedido** por [ADR-038](ADR-038-front-deploy-tarball-ssh.md) (tarball + SSH, como a API). Branch `develop`/`main` e URLs `NEXT_PUBLIC_*` continuam aqui.

## Contexto

O front é export estático (`output: "export"` → `out/`) e sobe na Hostinger Unlimited. O padrão da agência (ex. `hidrus-frontend-admin`) era GitHub Actions: build no runner e sync FTP. O FTP ficheiro a ficheiro passou a ser o gargalo (~6 min vs ~30 s de `pnpm build`).

Staging (`develop`) e produção (`main`) diferem pelo diretório no servidor.

## Decisão

| Escolha | Por quê |
|---------|---------|
| `develop` → staging, `main` → prod | Mesmo job reutilizável; destinos separados |
| Pasta DEV / PRD distintas | Staging e prod não se misturam |
| URLs de staging: `NEXT_PUBLIC_*` (sem sufixo) | Já configuradas e em uso |
| URLs de prod: `NEXT_PUBLIC_*_PRD` | O HTML do `pnpm build` não pode apontar para `dev.eaimesa.com` |
| Transporte: tarball + SSH | [ADR-038](ADR-038-front-deploy-tarball-ssh.md) |

Contrato: [docs/ops/dev-setup.md](../ops/dev-setup.md). Workflows: `.github/workflows/deploy-develop.yml`, `deploy-main.yml` → `deploy-reusable.yml`.

## Alternativas consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| Git da Hostinger (hPanel) | Simples | Sem `pnpm build`; subiria fonte, não `out/` |
| FTP ficheiro a ficheiro | Sem SSH | ~6 min; 550/timeout — **foi o caminho inicial** |
| Vercel / Cloudflare Pages | CI nativo | Fora da Hostinger já contratada ([ADR-015](ADR-015-dois-repositorios.md)) |
| Um único `public_html` | Menos variables | Staging e prod se sobrescrevem |

## Consequências

- Branch padrão **`develop`**. PRs (Cursor incluso) mergeiam em `develop`. **`main`** só com PR explícito no GitHub ou pedido para promover a prod.
- Push em `develop` ou `main` dispara o deploy da pasta correspondente.
- No Laravel, `APP_URL` de cada API deve ser a origem do front daquele ambiente (CORS/cookies).
