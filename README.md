# EaiMesa — frontend

Next.js: landing, cadastro, painel, cardápio `/{slug}`, garçom e `/admin`.

API: [eaimesa-backend](https://github.com/filiperamosds/eaimesa-backend) (Laravel, porta 8000).

## Local

No outro terminal a API já deve estar em http://localhost:8000.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Site: http://localhost:3000 — o browser chama `NEXT_PUBLIC_API_URL` (Laravel). Sem proxy `/v1`.

## Estático (Hostinger)

Staging: push em `develop` → tarball SSH na pasta DEV. Produção: push em `main` → pasta PRD. Setup: [`docs/ops/dev-setup.md`](docs/ops/dev-setup.md). ADR: [`docs/decisions/ADR-038-front-deploy-tarball-ssh.md`](docs/decisions/ADR-038-front-deploy-tarball-ssh.md).

Branch padrão **`develop`**. `main` só com PR explícito.

Branch padrão **`develop`**. `main` (prod) só com PR explícito.

```bash
pnpm build
```

Sai em `out/`. O `.htaccess` é copiado do `public/` no build. O Actions empacota `out/` e extrai por SSH; se o upload for manual no FileZilla, ative “mostrar arquivos ocultos”, senão o QR `/{slug}/c/{token}` cai no 404 da Hostinger.

No painel Hostinger, desative página de erro 404 personalizada (a do skate) se ela sobrescrever o `.htaccess`.

No `.env` de produção: `NEXT_PUBLIC_API_URL` = URL pública da API; no Laravel, `APP_URL` = origem deste front (CORS/cookies).

- Cardápio demo: http://localhost:3000/seu-estabelecimento
- Pedidos: http://localhost:3000/painel/pedidos
- Console SaaS: http://localhost:3000/admin
- Equipe do console: http://localhost:3000/admin/equipe

Login demo: `dono@seuestabelecimento.com` / `Teste@123` · operador `ops@eaimesa.local` / `Teste@123`

Índice: [`docs/`](docs/README.md). Setup: [`docs/ops/dev-setup.md`](docs/ops/dev-setup.md).
