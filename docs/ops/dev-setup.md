# Setup de desenvolvimento — frontend

Next.js neste repositório. API: [eaimesa-backend](https://github.com/filiperamosds/eaimesa-backend) (Laravel `:8000`).

No `.env` deste repo: `NEXT_PUBLIC_API_URL=http://localhost:8000`. O browser chama a API Laravel direto (export estático não tem proxy `/v1`). Ver [ADR-015](../decisions/ADR-015-dois-repositorios.md).

## Pré-requisitos

- Node.js **20+** (recomendado 22; `.nvmrc` na raiz)
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9 --activate`)
- API Laravel já rodando em `:8000` (outro terminal / outro clone)

## Cursor Cloud (agente remoto)

Configuração versionada: `.cursor/environment.json`

```bash
bash scripts/cursor-cloud/install.sh
bash scripts/cursor-cloud/start.sh
pnpm dev
```

Sem teste de UI/desktop no Cloud Agent. Validar com `pnpm typecheck`.

## Bootstrap

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Site: http://localhost:3000

| App | URL |
|-----|-----|
| Web | http://localhost:3000 |
| Cardápio seed | http://localhost:3000/bar-do-tiao |
| Pedidos (Kanban) | http://localhost:3000/painel/pedidos |
| Mesas | http://localhost:3000/painel/mesas |
| Equipe | http://localhost:3000/painel/equipe |
| Garçom | http://localhost:3000/garcom |
| PIN join | http://localhost:3000/bar-do-tiao/entrar |
| Console | http://localhost:3000/admin |

Login demo abre direto o Kanban. Garçom demo: `garcom@bardotiao.local` / `demo1234`. Operador: `ops@eaimesa.local` / `demo1234`.

Não há segundo front na porta 3001.

## Rede local (celular / tablet no mesmo Wi‑Fi)

No Mac: **Ajustes do Sistema → Geral → Compartilhamento → Nome local** (ex. `mac-filipe`).

```env
NEXT_PUBLIC_APP_URL=http://mac-filipe.local:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- `NEXT_PUBLIC_APP_URL` — URL que o celular usa.
- `NEXT_PUBLIC_API_URL` — origem da API Laravel. No celular, se o JS rodar no aparelho, use o host alcançável da API **ou** um proxy; em prod o front estático chama o host público da API.
- No **backend**, `APP_URL` precisa ser o mesmo host que o celular alcança (`http://mac-filipe.local:3000`) — CORS e QR.

O Next já escuta em `0.0.0.0:3000`. Firewall: permitir Node/Terminal.

| URL | Uso |
|-----|-----|
| `http://mac-filipe.local:3000/bar-do-tiao` | Cardápio público |
| `http://mac-filipe.local:3000/bar-do-tiao/entrar` | PIN join |
| `http://mac-filipe.local:3000/garcom` | App garçom |

`http://mac-filipe.local` e o IP da LAN **não** são contexto seguro: `crypto.randomUUID` some no Chrome/Safari. O carrinho gera o `Idempotency-Key` com fallback.

## Página em branco / não carrega

```bash
cp .env.example .env
pnpm install
pnpm typecheck
pnpm dev
```

Aguarde **`✓ Ready`** do Next. Causas frequentes: API Laravel parada (`:8000`), porta 3000 ocupada, sem `.env`.

```bash
curl -I http://localhost:3000/
curl http://localhost:8000/health
```

## Estático (`out/`)

`pnpm build` gera HTML em `out/` (`output: "export"`). Suba o **conteúdo** dessa pasta no Hostinger. `.htaccess` cobre `/{slug}/c/{token}` e slugs que não estavam no build (`STATIC_SLUGS` + `__venue`).

## Deploy — GitHub Actions (`develop`)

Staging sobe sozinho em push na branch `develop` (e no botão **Run workflow**). Workflow: `.github/workflows/deploy-develop.yml`. Decisão: [ADR-017](../decisions/ADR-017-github-actions-hostinger.md).

No GitHub: **Settings → Secrets and variables → Actions**.

### Secrets

| Nome | Valor (hPanel → FTP) |
|------|----------------------|
| `FTP_SERVER` | Host FTP (ex. `ftp.seudominio.com`) |
| `FTP_USERNAME` | Usuário FTP |
| `FTP_PASSWORD` | Senha FTP |

### Variables

| Nome | Valor |
|------|--------|
| `NEXT_PUBLIC_APP_URL` | Origem pública deste front (ex. `https://dev.eaimesa.com`) |
| `NEXT_PUBLIC_API_URL` | Origem pública da API Laravel |
| `FTP_SERVER_DIR` | Opcional. Destino no servidor; default `/public_html/` |
| `STATIC_SLUGS` | Opcional. Default do código: `bar-do-tiao,cafe-da-lina` |

O job apaga o destino FTP (`dangerous-clean-slate`) e manda só `out/`. Use um `public_html` (ou subdomínio) **só deste front**.

No Laravel de staging, `APP_URL` = o mesmo `NEXT_PUBLIC_APP_URL` (CORS/cookies).

FTP falhou? No hPanel confira host/usuário; se a Hostinger exigir TLS, troque `protocol: ftp` por `ftps` no workflow. Produção em `main` ainda é upload manual (ou um segundo workflow depois).
