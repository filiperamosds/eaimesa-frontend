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
| Cardápio seed | http://localhost:3000/seu-estabelecimento |
| Pedidos (Kanban) | http://localhost:3000/painel/pedidos |
| Estabelecimento | http://localhost:3000/painel/configuracoes/bar |
| Mesas | http://localhost:3000/painel/configuracoes/mesas |
| Chamada | http://localhost:3000/painel/configuracoes/chamada |
| Chamados | http://localhost:3000/painel/chamados |
| Equipe | http://localhost:3000/painel/configuracoes/equipe |
| Responsável | http://localhost:3000/painel/configuracoes/responsavel |
| Pagamento | http://localhost:3000/painel/pagamento |
| Garçom | http://localhost:3000/garcom |
| PIN join | http://localhost:3000/seu-estabelecimento/entrar (redirect no plano Cardápio) |
| Console | http://localhost:3000/admin |
| Equipe (console) | http://localhost:3000/admin/equipe |
| Integrações | http://localhost:3000/admin/integracoes |

Login demo (plano Cardápio) abre o painel do estabelecimento. Dono: `dono@seuestabelecimento.com` / `Teste@123`. Operador: `ops@eaimesa.local` / `Teste@123`. Sem garçom demo no seed.

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
| `http://mac-filipe.local:3000/seu-estabelecimento` | Cardápio público |
| `http://mac-filipe.local:3000/seu-estabelecimento/entrar` | PIN join (redirect no seed Cardápio) |
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

Rotas novas da fatia 18 (`/confirmar-email`, `/esqueci-senha`, `/redefinir-senha`, `/convite`) saem como pastas no export. Convite usa query `?token=` (não path), porque o token é dinâmico.

Cron de e-mail (trial acabando) é da **API Laravel**, não deste front. No hPanel: tipo **Personalizado**, `php artisan schedule:run` na pasta da API — não `wget …/wp-cron.php`. Ver ops do backend.

## Git

| Branch | Papel |
|--------|--------|
| `develop` | Padrão. Staging. PRs do Cursor mergeiam aqui. Push → pasta DEV no servidor |
| `main` | Produção. Só com PR explícito. Push → pasta PRD no servidor |

No GitHub: **Settings → General → Default branch → `develop`**.

## Deploy — GitHub Actions

Push em `develop` ou `main` (e **Run workflow** na branch certa). Callers: `.github/workflows/deploy-develop.yml` e `deploy-main.yml`. `pnpm build` gera `out/`; o runner empacota num `.tgz` e extrai por SSH ([ADR-038](../decisions/ADR-038-front-deploy-tarball-ssh.md)). Branch/URLs: [ADR-017](../decisions/ADR-017-github-actions-hostinger.md).

No GitHub: **Settings → Secrets and variables → Actions**. Copiar as credenciais SSH do repo **eaimesa-backend** (é o mesmo servidor Hostinger).

### Secrets

| Nome | Valor |
|------|--------|
| `SSH_PRIVATE_KEY` | Mesma chave da API (bloco `BEGIN`…`END`) |
| `REMOTE_HOST` | Hostname ou IP (**sem** `://` nem path). Se vazio, usa `FTP_SERVER` |
| `REMOTE_USER` | Utilizador SSH |

### Variables

| Nome | Ambiente | Valor |
|------|----------|--------|
| `REMOTE_PORT` | ambos | Vazio = 22. Hostinger shared costuma ser `65002` |
| `REMOTE_TARGET_FRONT_DEV` | `develop` | Pasta no servidor (ex. `domains/eaimesa.com/public_html/dev`). Fallback: `FTP_SERVER_DIR_DEV` |
| `REMOTE_TARGET_FRONT_PRD` | `main` | Pasta de produção (ex. `domains/eaimesa.com/public_html`). Fallback: `FTP_SERVER_DIR_PRD` |
| `FTP_SERVER_DIR_DEV` / `_PRD` | fallback | Pastas do job FTP antigo; ainda servem de destino se `REMOTE_TARGET_FRONT_*` não existir |
| `NEXT_PUBLIC_APP_URL` | `develop` | Origem do front de staging (ex. `https://dev.eaimesa.com`) |
| `NEXT_PUBLIC_API_URL` | `develop` | API Laravel de staging (ex. `https://apidev.eaimesa.com`) |
| `NEXT_PUBLIC_APP_URL_PRD` | `main` | Origem do front de produção (ex. `https://eaimesa.com`) |
| `NEXT_PUBLIC_API_URL_PRD` | `main` | API Laravel de produção |
| `STATIC_SLUGS` | ambos | Opcional. Default do código: `seu-estabelecimento` |

As pastas DEV e PRD têm que ser **diferentes**, e **não** podem ser a pasta da API (`REMOTE_TARGET_API_*`). O extract faz `rsync --delete` (se o servidor tiver `rsync`) e limpa hashes velhos em `_next/`; os excludes são **só na raiz** (`/app/`, `/vendor/`, `/api/`, …) para não bloquear `_next/static/chunks/app/` ([ADR-040](../decisions/ADR-040-rsync-exclude-chunks-app.md)). Sem `rsync`, o tar só sobrepõe.

O `.htaccess` do front (`public/.htaccess`) só reescreve slugs do Next. **Não** manda CORS. Login chama `NEXT_PUBLIC_API_URL` (`https://apidev.eaimesa.com` / `https://api.eaimesa.com`). Se esses hosts devolverem o 404 da Hostinger, o browser mostra CORS. Restaurar a API: document root = `app/public` do Laravel e re-run do deploy do **backend**.

No Laravel de cada ambiente, `APP_URL` = o `NEXT_PUBLIC_APP_URL` correspondente (CORS/cookies).

Antes do primeiro push em `main`, grave `NEXT_PUBLIC_APP_URL_PRD` e `NEXT_PUBLIC_API_URL_PRD` — senão o job de produção recusa o build (não reutiliza as URLs de staging).
