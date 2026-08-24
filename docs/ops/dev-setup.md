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
| Meu bar | http://localhost:3000/painel/configuracoes/bar |
| Mesas | http://localhost:3000/painel/mesas |
| Equipe | http://localhost:3000/painel/configuracoes/equipe |
| Responsável | http://localhost:3000/painel/configuracoes/responsavel |
| Pagamento | http://localhost:3000/painel/pagamento |
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

## Git

| Branch | Papel |
|--------|--------|
| `develop` | Padrão. Staging. PRs do Cursor mergeiam aqui. Push → FTP `FTP_SERVER_DIR_DEV` |
| `main` | Produção. Só com PR explícito. Push → FTP `FTP_SERVER_DIR_PRD` |

No GitHub: **Settings → General → Default branch → `develop`**.

## Deploy — GitHub Actions

Push em `develop` ou `main` (e **Run workflow** na branch certa). Callers: `.github/workflows/deploy-develop.yml` e `deploy-main.yml`. Decisão: [ADR-017](../decisions/ADR-017-github-actions-hostinger.md).

No GitHub: **Settings → Secrets and variables → Actions**.

### Secrets

| Nome | Valor (hPanel → Contas FTP) |
|------|----------------------|
| `FTP_SERVER` | Só o **IP** (sem `ftp://`) |
| `FTP_USERNAME` | Usuário FTP |
| `FTP_PASSWORD` | Senha FTP |

`FTP_SERVER` pode ser Variable em vez de Secret. Vale para os dois ambientes.

### Variables

| Nome | Ambiente | Valor |
|------|----------|--------|
| `FTP_SERVER_DIR_DEV` | `develop` | Pasta FTP de staging (ex. `domains/eaimesa.com/public_html/dev/`) |
| `FTP_SERVER_DIR_PRD` | `main` | Pasta FTP de produção (ex. `domains/eaimesa.com/public_html/`) |
| `NEXT_PUBLIC_APP_URL` | `develop` | Origem do front de staging (ex. `https://dev.eaimesa.com`) |
| `NEXT_PUBLIC_API_URL` | `develop` | API Laravel de staging (ex. `https://apidev.eaimesa.com`) |
| `NEXT_PUBLIC_APP_URL_PRD` | `main` | Origem do front de produção (ex. `https://eaimesa.com`) |
| `NEXT_PUBLIC_API_URL_PRD` | `main` | API Laravel de produção |
| `STATIC_SLUGS` | ambos | Opcional. Default do código: `bar-do-tiao,cafe-da-lina` |

O job faz sync incremental. Antes do upload, `scripts/ftp-prepare.py` recria as pastas do `out/` e apaga `.ftp-deploy-sync-state.json` se o wipe anterior deixou o servidor inconsistente (FTP 550 em `__venue/bem-vindo/`). As pastas DEV e PRD têm que ser **diferentes**. Hashes antigos em `_next/` podem sobrar; o HTML novo aponta só para os arquivos do último build.

No Laravel de cada ambiente, `APP_URL` = o `NEXT_PUBLIC_APP_URL` correspondente (CORS/cookies).

A action exige barra no **final** do path; o workflow acrescenta se faltar. Path sem `/` no começo é relativo ao home FTP.

Antes do primeiro push em `main`, grave `NEXT_PUBLIC_APP_URL_PRD` e `NEXT_PUBLIC_API_URL_PRD` — senão o job de produção recusa o build (não reutiliza as URLs de staging).
