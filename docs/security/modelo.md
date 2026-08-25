# Modelo de segurança

## Princípios

1. **Tenancy:** `venue_id` sempre do token/sessão, nunca do body confiável.
2. **QR público ≠ auth de comanda:** slug da casa / QR fixo na mesa **não** abre comanda. Modo comanda **só** com QR do garçom (claim). O QR da mesa traz `?mesa=` só na 1ª abertura; o front guarda em `sessionStorage` e limpa a URL antes de criar **presença** (chamar garçom) — [ADR-026](../decisions/ADR-026-chamar-garcom-qr-mesa.md).
3. **Presença (comanda):** claim do garçom (TTL, uso único) + PIN para o grupo. Export do claim não vira adesivo permanente.
4. **Preço no servidor:** painel envia `priceCents` no cardápio; pedido (balcão ou guest) manda só `catalogItemId` + qtd.
5. **Separação de auth:** cookie dono ≠ cookie guest ≠ cookie presença ≠ platform admin.

## Papéis

| Papel | Auth | Escopo | Fatia 11 |
|-------|------|--------|----------|
| Público | — | Ler cardápio por slug | Sim |
| Owner | Cookie `eaimesa_owner` | Cardápio; resto conforme o plano | Sim |
| Guest | Cookie `eaimesa_guest` | Mesa + comanda + pedidos (Auto atendimento) | Sim |
| Staff | Cookie `eaimesa_owner` (`role: staff`; `member.role` `staff`, `cashier` ou `panel`) | Garçom/caixa: mesas, claims, fila; close só se caixa, dono, ou `staffCanCloseTabs`. Painel: só fila filtrada por categoria | Sim |
| Platform | Cookie `eaimesa_platform` | Tenants, catálogo, dashboard, logs | Sim (senha; 2FA depois) |

## Ameaças SaaS

| Ameaça | Controle |
|--------|----------|
| IDOR entre bares | Filtro `venue_id` da sessão; testes depois; RLS |
| Pedido remoto | Claim + PIN + comanda pessoal; slug sozinho não cria pedido; plano Cardápio não tem pedido |
| Plano / feature | `PLAN_FEATURE` no servidor; Cardápio tem mesas (QR), sem equipe/pedido/comanda |
| Preço adulterado no pedido | Recalcular no servidor |
| XSS no cardápio | Texto; escape no React; CSP depois |
| Guest → admin | Cookies distintos; RBAC server-side |
| Garçom encerra conta | 403 `CASHIER_REQUIRED` se `staffCanCloseTabs=false`; só caixa/dono |
| Painel acessa mesa/claim/close | 403 `PANEL_FORBIDDEN`; Kanban só com as categorias do membro |
| Enumeração de slug | 404 genérico; slugs não sequenciais |
| PII em log | Não logar senha; e-mail só em auth errors genéricos. Viewer `/admin/logs` só com cookie platform; texto escapado no React |
| Secret na URL | Cookie httpOnly após login |
| Estender trial/vigência no console | Cookie `eaimesa_platform`; 404 se o id não existe; **não** cobra no Asaas |

## Headers e cookies

- HTTPS + HSTS em produção
- Cookie dono: `Secure` (prod); `HttpOnly`; `SameSite=Lax`; `Path=/`
- Cookie platform: `eaimesa_platform` — mesmo atributo, **JWT e secret distintos**. Convive com `eaimesa_owner` no mesmo browser. Logout de um **não** apaga o outro.
- Cookie guest: `eaimesa_guest` — terceiro cookie; também convive.
- CORS: origens do front (`APP_URL` e `CORS_ALLOWED_ORIGINS`), `credentials: true`. `APP_URL` é o site (ex. `https://eaimesa.com`), **não** `https://api.eaimesa.com`.
- Não usar o mesmo JWT para dono e guest

## Rate limits (inicial)

| Ação | Limite |
|------|--------|
| Login / register | 10/min/IP |
| Login do console (`/v1/platform/auth/login`) | 10/min/IP |
| Redeem claim | 20/min/IP |
| PIN join | 5 falhas / 15 min / IP+venue |
| Pedido guest | 20/min/IP |
| Checkout / pagador | 10/min/venue |

Na fatia 1 o limiter de login pode ser in-memory (um processo).

## LGPD

- **Controlador:** estabelecimento (quando houver pedidos).
- **Operador:** EaiMesa (infra, processamento).
- Cadastro B2B na fatia 1: só e-mail + senha + nome do bar. CNPJ/CPF de **pagador** só no checkout hosted (trânsito; API não persiste). KYC do responsável entra em fatia posterior.
- CPF do **consumidor** não coletar no MVP para pedir.
- **Telefone + nome** na comanda pessoal (fatia 6): PII do estabelecimento (controlador). API staff devolve telefone **mascarado**. Não logar telefone.
- PAN / CVV: só em trânsito HTTPS no `POST /v1/billing/checkout` (cartão) até o Asaas. Não persistir, não logar. Guardamos `credit_card_token` cifrado + last4. PIX continua na página hosted. [ADR-020](../decisions/ADR-020-cartao-no-painel.md).

## Cadastro B2B (KYC — fatia posterior)

- CNPJ + CPF responsável + e-mail verificado + OTP celular.
- CPF mascarado na UI (`***.***.***-12`).
- Secrets em env local / SSM em prod — ver `.env.example`.

## CI / deploy

- Senha FTP e demais secrets só em **GitHub Actions secrets**, nunca no git nem no `out/`.
- `NEXT_PUBLIC_*` vai para o HTML no `pnpm build` (não é secret). Staging usa Variables do GitHub; ver [dev-setup](../ops/dev-setup.md) e [ADR-017](../decisions/ADR-017-github-actions-hostinger.md).
- O job de `develop` apaga o diretório FTP de destino: o usuário FTP deve enxergar **somente** o `public_html` deste front.

## Nunca

- Token de sessão na query string
- `/mesa/1` sequencial como auth
- Um JWT para guest e owner
- Confiar em `venueId` enviado pelo client no CRUD
- Enviar PAN/CVV para a API fora do checkout, persistir PAN ou logar cartão
- Tratar `?checkout=ok` como pagamento confirmado
- Expor `/admin/logs` sem cookie `eaimesa_platform`
- Impressora do bar exposta na internet (fase 2: agente outbound)
- Commitar senha FTP, `.env` de staging ou `out/`
