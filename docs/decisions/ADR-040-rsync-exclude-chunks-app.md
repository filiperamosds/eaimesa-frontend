# ADR-040 — rsync do front não pode exclude `app` solto

**Status:** Aceito  
**Data:** 2026-09-03  
**Depende de:** [ADR-038](ADR-038-front-deploy-tarball-ssh.md)  
**Corrige:** `--exclude 'app'` de [PR #78](https://github.com/filiperamosds/eaimesa-frontend/pull/78)

## Contexto

O extract do front usa `rsync --delete` e precisava **não** apagar uma pasta Laravel `app/` se ela vivesse no mesmo document root. O padrão `--exclude 'app'` (sem `/`) no rsync casa **qualquer** componente chamado `app`, inclusive `_next/static/chunks/app/` — os JS das rotas do App Router.

Depois do merge da identidade (#79), o HTML novo apontava para hashes novos; esses ficheiros não subiam. O webpack da home (fora de `chunks/app/…/layout`) carregava; `/painel`, `/cadastro`, `/garcom` davam `ChunkLoadError` 404. Em `dev.eaimesa.com`, `/_next/static/chunks/app/login/page-*.js` (stub que não mudou) respondia 200; `…/cadastro/page-*.js` e `…/painel/layout-*.js` (hashes novos) 404.

## Decisão

1. Excludes **ancorados na raiz do destino**: `/app/`, `/vendor/`, `/artisan`, `/api/`, `/dev/` (staging no mesmo `public_html`), … — não `app` solto.
2. Dois `rsync`: primeiro sem `--delete` (publica hashes novos); depois com `--delete` (troca o HTML e limpa hashes velhos).
3. Depois do rsync, falhar o job se algum `.js`/`.css` de `_next/` no tarball não existir no DEST.
4. No browser: recarregar uma vez se chegar `ChunkLoadError` (tab aberto no `--delete`). HTML com `Cache-Control: no-cache`.

## Alternativas

| Opção | Por que não |
|-------|-------------|
| Só o reload no cliente | Os chunks novos continuam fora do servidor |
| Não usar `--delete` | `_next/` acumula hashes para sempre na Hostinger |
| `--exclude '_next/static/chunks/app'` invertido | O bug é o contrário: essa pasta **tem** de ir |

## Consequências

- Workflow: [`.github/workflows/deploy-reusable.yml`](../../.github/workflows/deploy-reusable.yml)
- Cliente: `components/chunk-load-recovery.tsx`
- Setup: [dev-setup](../ops/dev-setup.md)
