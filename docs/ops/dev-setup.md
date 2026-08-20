# Setup de desenvolvimento — frontend

Next.js neste repositório. API: [eaimesa-backend](https://github.com/filiperamosds/eaimesa-backend) (Laravel `:8000`).

No `.env` deste repo: `API_URL=http://localhost:8000`. O Next faz proxy de `/v1` para a API. Ver [ADR-015](../decisions/ADR-015-dois-repositorios.md).

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
API_URL=http://localhost:8000
```

- `NEXT_PUBLIC_APP_URL` — URL que o celular usa.
- `API_URL` — proxy interno do Next (`/v1/*` → `:8000`); pode continuar `localhost` porque só o servidor Next chama a API.
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
