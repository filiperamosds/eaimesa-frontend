# Arquitetura — overview

## Stack (MVP)

| Camada | Tecnologia | Motivo |
|--------|------------|--------|
| Git | **Dois repos** ([ADR-015](../decisions/ADR-015-dois-repositorios.md)) | API e Next sobem em processos/deploys separados |
| API | **Laravel 13** ([ADR-016](../decisions/ADR-016-laravel-mysql.md)) | REST, cookies |
| DB | **MySQL 8** | Transações |
| ORM | Eloquent | Migrations, models |
| UI | **Next.js** (um app) | Landing + painel + cardápio |
| Auth dono | Cookie **httpOnly** `eaimesa_owner` | JWT assinado |
| Auth guest | Cookie `eaimesa_guest` | Redeem (fatia 4) e PIN join (fatia 5) |
| Auth platform | Cookie **httpOnly** `eaimesa_platform` | JWT próprio (`PLATFORM_JWT_SECRET`) |
| Cache/fila | Redis | Fase 2 |

Ver [ADR-001](../decisions/ADR-001-stack.md) (histórico), [ADR-003](../decisions/ADR-003-frontend-unico.md), [ADR-004](../decisions/ADR-004-slug-publico.md), [ADR-015](../decisions/ADR-015-dois-repositorios.md), [ADR-016](../decisions/ADR-016-laravel-mysql.md), [ADR-017](../decisions/ADR-017-github-actions-hostinger.md), [ADR-018](../decisions/ADR-018-payment-gateway-asaas.md).

## Repositórios

```
eaimesa-backend/          # https://github.com/filiperamosds/eaimesa-backend
├── app/                  # controllers, models, JWT cookies, Support
├── database/migrations/  # schema MySQL
├── routes/api.php        # REST /v1 (:8000)
├── docs/
└── docker-compose.yml    # MySQL 8 local

eaimesa-frontend/         # https://github.com/filiperamosds/eaimesa-frontend
├── app/                  # Next.js único (:3000)
├── packages/shared/      # zod, slug, planos (só TS)
└── next.config.ts        # `output: "export"` → pasta `out/`
```

Não existem `apps/guest` nem `apps/staff`.

## Multi-tenant

- Toda entidade operacional tem `venue_id`.
- URL pública do cardápio: `venue.slug` (`bar-do-tiao`).
- `venue.public_id` é opaco e estável (uso interno / claims futuros).
- Sessão do dono carrega `account_id` + `venue_id` + `role=owner` — nunca confiar no body para tenancy.
- Staff JWT carrega `venue_id` + `role` (`owner` | `staff`). Perfil caixa/garçom/painel: `member.role`. Painel ainda leva `categoryIds`.

## Rotas do front

| Path | App |
|------|-----|
| `/` | Landing SaaS |
| `/cadastro`, `/login` | Auth estabelecimento |
| `/painel` | Redirect pedidos ou configurações/cardápio conforme o plano |
| `/painel/pedidos` | Kanban do dono (tudo) ou do perfil Painel (filtrado por categoria) |
| `/painel/mesas` | Mesas (CRUD + QR fixo) — operacional Auto atendimento |
| `/painel/configuracoes` | Hub: cardápio, bar, equipe, responsável |
| `/painel/configuracoes/cardapio` | CRUD do cardápio |
| `/painel/configuracoes/bar` | Nome, slug, encerramento no salão |
| `/painel/configuracoes/equipe` | Staff / caixa / painel |
| `/painel/configuracoes/responsavel` | Responsável / pagador Asaas ([ADR-025](../decisions/ADR-025-responsavel-configuracoes.md)) |
| `/painel/pagamento` | Checkout (cartão ou PIX). `/painel/bar/plano` redireciona para cá |
| `/painel/cardapio`, `/painel/bar/*`, `/painel/equipe` | Redirects legados |
| `/{slug}` | Cardápio público (pedido/PIN só no Auto atendimento) |
| `/{slug}/c/{token}` | Redeem do claim (redirect se plano Cardápio) |
| `/{slug}/bem-vindo` | PIN no primeiro aparelho |
| `/{slug}/entrar` | PIN join (redirect se plano Cardápio) |
| `/{slug}/comanda` | Nome + telefone **ou** parcial da comanda |
| `/garcom` | Mesas do garçom |
| `/garcom/pedidos` | Kanban do garçom |
| `/admin/login`, `/admin` | Console da plataforma (operador) |
| `/admin/bares`, `/admin/planos`, `/admin/logs` | Tenants, catálogo e logs Laravel |

## Integrações

| Integração | Fase |
|------------|------|
| Asaas (assinatura B2B, checkout hospedado) | Fatia 12 |
| Mercado Pago / Stripe BR (pagamento conta da mesa) | Depois |
| Agente ESC/POS local | Fase 2 |

## Ambientes

| Env | Uso | Front |
|-----|-----|-------|
| `local` | MySQL 8 + **dois terminais**: backend `:8000`, frontend `:3000` | `pnpm dev` |
| `cursor-cloud` | MySQL nativo (apt) via `.cursor/environment.json`; sem Docker | `pnpm dev` |
| `staging` | Piloto 1 bar | GitHub Actions em `develop` → `FTP_SERVER_DIR_DEV` ([ADR-017](../decisions/ADR-017-github-actions-hostinger.md)) |
| `prod` | SaaS | GitHub Actions em `main` → `FTP_SERVER_DIR_PRD`. Só PR explícito |

Setup: [docs/ops/dev-setup.md](../ops/dev-setup.md).

## Observabilidade (MVP mínimo)

- Logs estruturados JSON (sem PII completa)
- Health: `GET /health`
- Métricas básicas depois (pedidos/min, redeem falho)
