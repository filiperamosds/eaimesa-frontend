# EaiMesa — frontend

Next.js: landing, cadastro, painel, cardápio `/{slug}`, garçom e `/admin`.

API: **[eaimesa-backend](https://github.com/filiperamosds/eaimesa-backend)** (porta 4000).

## Local (este terminal)

No outro terminal a API já deve estar em http://localhost:4000.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Site: http://localhost:3000 — o Next faz proxy de `/v1` para `API_URL`.
