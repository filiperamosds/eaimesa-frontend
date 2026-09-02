# ADR-038 — Deploy do front: tarball + SSH (como a API)

**Status:** Aceito  
**Data:** 2026-09-02  
**Supersede:** transporte FTP de [ADR-017](ADR-017-github-actions-hostinger.md)  
**Depende de:** [ADR-017](ADR-017-github-actions-hostinger.md) (branch `develop`/`main`, URLs `NEXT_PUBLIC_*`)

## Contexto

O Next continua a gerar `out/` (`output: "export"`). O job antigo fazia `pnpm build` (~30 s) e depois **FTP ficheiro a ficheiro** (~6 min na Hostinger). A API já sobe num `.tgz` por SCP + extract SSH e o deploy inteiro fica ~45 s.

O `pnpm build` não desaparece: TypeScript/React ainda precisam virar HTML. O que muda é o **transporte** do artefacto.

## Decisão

1. Runner: `pnpm typecheck` + `pnpm build` → empacota `out/` num `front-deploy.tgz`.
2. Um SCP + SSH extract no document root (`appleboy/scp-action` / `ssh-action`), o mesmo padrão da API.
3. No servidor, `rsync --delete` (se existir) alinha a pasta com o tarball e limpa hashes velhos em `_next/`. Preserva `cgi-bin` e `.well-known`.
4. Destino: `REMOTE_TARGET_FRONT_DEV` / `_PRD`, com fallback para as variables já existentes `FTP_SERVER_DIR_DEV` / `_PRD`.
5. Credenciais SSH: as mesmas da API (`SSH_PRIVATE_KEY`, `REMOTE_HOST`, `REMOTE_USER`, `REMOTE_PORT`). `REMOTE_HOST` pode cair em `FTP_SERVER` (IP).

`develop` → staging, `main` → prod: inalterado.

## Alternativas rejeitadas

| Opção | Por quê não |
|-------|-------------|
| Continuar FTP incremental | ~6 min; 550/timeout; `ftp-prepare.py` |
| Tarball por FTP sem SSH | O servidor não extrai; o `.tgz` ficaria na web |
| Saltar `pnpm build` | Hostinger não corre Next; o artefacto **é** o `out/` |

## Consequências

- No GitHub do **frontend**, copiar os secrets SSH do repo da API antes do primeiro job. Sem eles o deploy falha de propósito (não volta ao FTP).
- `scripts/ftp-prepare.py` e `FTP-Deploy-Action` saem do pipeline. Secrets FTP podem ficar órfãos.
- Extract a meio deixa HTML a meio: `cancel-in-progress: false`.
- Workflow: [`.github/workflows/deploy-reusable.yml`](../../.github/workflows/deploy-reusable.yml). Setup: [docs/ops/dev-setup.md](../ops/dev-setup.md).
