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

Site: http://localhost:3000 — o Next faz proxy de `/v1` para `API_URL`.

- Cardápio demo (Auto atendimento): http://localhost:3000/bar-do-tiao
- Cardápio demo (só Cardápio): http://localhost:3000/cafe-da-lina
- Pedidos: http://localhost:3000/painel/pedidos
- Console SaaS: http://localhost:3000/admin

Login demo: `dono@bardotiao.local` / `demo1234` · `garcom@bardotiao.local` / `demo1234` · `ops@eaimesa.local` / `demo1234`

Índice: [`docs/`](docs/README.md). Setup: [`docs/ops/dev-setup.md`](docs/ops/dev-setup.md).
