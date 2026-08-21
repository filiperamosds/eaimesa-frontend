# ADR-017 — GitHub Actions + FTP Hostinger (develop)

## Status

Aceito.

## Contexto

O front é export estático (`output: "export"` → `out/`) e sobe na Hostinger Unlimited. Até agora o upload era manual (FileZilla). O padrão da agência (ex. `hidrus-frontend-admin`) é GitHub Actions: build no runner e sync FTP para `public_html`.

Produção (`main`) ainda não entra: o primeiro ambiente automático é **staging em `develop`**.

## Decisão

| Escolha | Por quê |
|---------|---------|
| Trigger só em `develop` (+ `workflow_dispatch`) | Começar pelo staging; `main` não dispara deploy |
| Build no GitHub Actions (`pnpm typecheck` + `pnpm build`) | `NEXT_PUBLIC_*` entra no HTML no build; a Hostinger só serve arquivos |
| FTP (`SamKirkland/FTP-Deploy-Action`) | Hostinger shared: FTP porta 21, sem SSH de deploy confiável no plano típico |
| Secrets no GitHub (FTP) + Variables (URLs públicas) | Nada de senha no git; URLs não são secretas |
| `dangerous-clean-slate: true` | `out/_next` muda de hash a cada build; senão o `public_html` acumula lixo |

Contrato: [docs/ops/dev-setup.md](../ops/dev-setup.md). Workflow: `.github/workflows/deploy-develop.yml`.

## Alternativas consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| Git da Hostinger (hPanel) | Simples | Sem `pnpm build`; subiria fonte, não `out/` |
| SFTP porta 65002 | Criptografado | Action FTP já cobre o caso; SFTP depois se o FTP falhar |
| Vercel / Cloudflare Pages | CI nativo | Fora da Hostinger já contratada ([ADR-015](ADR-015-dois-repositorios.md)) |
| Deploy em `main` agora | Um passo a menos | Staging e prod no mesmo host sem isolamento |

## Consequências

- Branch padrão **`develop`**. PRs (Cursor incluso) mergeiam em `develop`. **`main`** só com PR explícito no GitHub ou pedido para promover a prod.
- Criar a branch `develop` e apontá-la para o domínio/subdomínio de staging.
- No GitHub: Secrets `FTP_SERVER` (IP sem `ftp://`), `FTP_USERNAME`, `FTP_PASSWORD` e Variables `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_API_URL` **antes** do primeiro push útil em `develop`.
- No Laravel de staging, `APP_URL` = origem deste front (CORS/cookies).
- Pipeline de `main` (prod) fica para um workflow à parte, com outro `public_html` / domínio.
