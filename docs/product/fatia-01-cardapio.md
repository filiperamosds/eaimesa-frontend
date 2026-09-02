# Fatia 1 — Cardápio

Primeira entrega cobrável em pedaço: o estabelecimento entra, publica um cardápio, o cliente lê no celular. **Sem pedido, sem garçom, sem comanda.**

## Inclui

- Landing do SaaS (`/`)
- Cadastro e login do **estabelecimento** (`/cadastro`, `/login`). Cadastro: nome do estabelecimento, nome e CPF do responsável, e-mail, senha, plano. `/login` chama `GET /v1/auth/me`: sessão válida pula o form (dono → painel, staff → `/garcom`).
- Painel do dono: dados do estabelecimento + CRUD de categorias e itens (`/painel`)
- Cardápio público gerado pela URL configurada: `https://eaimesa.com.br/{slug}`  
  Exemplo: `/seu-estabelecimento`
- API REST correspondente (auth cookie + catálogo + menu público)

## Não inclui (fatias seguintes)

- Claim do garçom, PIN, cookie guest
- Carrinho / pedido pelo cliente (claim). Fila Kanban: ver [fatia 2](fatia-02-pedidos.md).
- Papel staff (garçom) separado do dono
- Billing / gateway
- App nativo, domínio customizado (`cardapio.bar.com`)

O cardápio público é **somente leitura**. Abrir `/{slug}` **não** autoriza pedir (regra permanente, ver [visão](visao.md)).

## UX do cardápio público (`/{slug}`)

- Itens agrupados pelas **categorias** ativas (Petiscos, Porções, …).
- Barra de grupos no topo (âncoras) para pular de seção no celular.
- Lista compacta: **miniatura + nome + preço**. Toque no item abre a **foto maior** e a descrição; toque de novo fecha. Só um item aberto por vez.
- Sem descrição e sem foto: a linha não expande.
- Foto: upload no painel (JPG/PNG/WebP, 2 MB) ou URL `https`. Seed demo usa arquivos em `public/seed/`.
- Painel: **Editar** na lista abre um **dialog** com foto, detalhes e receita (se o módulo `inventory` estiver ligado); um único **Salvar**. Descrição é **textarea** (até 280 caracteres). Preço no CRUD usa máscara com **2 casas** (`1250` → `R$ 12,50`); a API continua em centavos.

## Superfície única

Um único frontend (repo **eaimesa-frontend**) concentra marketing, autenticação B2B e cardápio público. Ver [ADR-003](../decisions/ADR-003-frontend-unico.md).

## Slug

- O front gera o slug a partir do **nome** (`Seu Estabelecimento` → `seu-estabelecimento`). Campo URL fica desabilitado no cadastro e em Configurações → Estabelecimento.
- Se o caminho já existir (ou for palavra reservada), acrescenta `-2`, `-3`… (`seu-estabelecimento-2`). Checagem: `GET /v1/public/venues/{slug}`.
- Formato: kebab-case, 3–48 caracteres (`seu-estabelecimento`).
- Palavras reservadas (`login`, `painel`, `cadastro`, …) não podem ser o slug final.
- `public_id` opaco continua no banco (estável se o slug mudar); a URL pública da fatia 1 é o **slug**.
- QR do cardápio (apontando para `/{slug}`) mora no **painel** autenticado e pode ser **exportado** (PNG) para mesa, porta, Instagram. Não autoriza pedir. Comanda só com QR do garçom (claim).

Ver [ADR-004](../decisions/ADR-004-slug-publico.md).

## Seed local

| Campo | Valor |
|-------|--------|
| Slug | `seu-estabelecimento` |
| Nome | Seu Estabelecimento |
| Plano | Cardápio |
| E-mail | `dono@seuestabelecimento.com` |
| Senha | `Teste@123` (somente local) |
