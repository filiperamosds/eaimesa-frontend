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

Staging: push em `develop` → `FTP_SERVER_DIR_DEV`. Produção: push em `main` → `FTP_SERVER_DIR_PRD`. Setup: [`docs/ops/dev-setup.md`](docs/ops/dev-setup.md). ADR: [`docs/decisions/ADR-017-github-actions-hostinger.md`](docs/decisions/ADR-017-github-actions-hostinger.md).

Branch padrão **`develop`**. `main` só com PR explícito.

```bash
pnpm build
```

Sai em `out/`. O `.htaccess` é copiado do `public/` no build. No FileZilla, se o upload for manual, ative “mostrar arquivos ocultos”, senão o QR `/{slug}/c/{token}` cai no 404 da Hostinger.

No painel Hostinger, desative página de erro 404 personalizada (a do skate) se ela sobrescrever o `.htaccess`.

No `.env` de produção: `NEXT_PUBLIC_API_URL` = URL pública da API; no Laravel, `APP_URL` = origem deste front (CORS/cookies).

- Cardápio demo (Auto atendimento): http://localhost:3000/bar-do-tiao
- Cardápio demo (só Cardápio): http://localhost:3000/cafe-da-lina
- Pedidos: http://localhost:3000/painel/pedidos
- Console SaaS: http://localhost:3000/admin

Login demo: `dono@bardotiao.local` / `demo1234` · `garcom@bardotiao.local` / `demo1234` · `ops@eaimesa.local` / `demo1234`

Índice: [`docs/`](docs/README.md). Setup: [`docs/ops/dev-setup.md`](docs/ops/dev-setup.md).
