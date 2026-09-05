# ADR-042: Fotos do cardápio no disco da API

**Status:** Aceito  
**Data:** 2026-09-05  
**Depende de:** [ADR-017](ADR-017-deploy-hostinger-ssh.md)

## Contexto

O upload já gravava em `storage/app/private/uploads` e `image_url` = `/v1/uploads/{uuid}.ext`. O extract do tarball no deploy recriava `storage/` e **apagava as fotos**. O cadastro ainda aceitava URL `https` que some se o host externo cair.

## Decisão

- Foto do dono só via `POST .../image`. Create/patch não aceitam `imageUrl`.
- Deploy: `--exclude` de `storage/app/private/uploads` e `storage/app/uploads`; backup/restore no SSH, no mesmo espírito do `.env`.
- Seed local pode continuar com `/seed/` ou Unsplash; isso não é o cadastro do dono.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| URL `https` no CRUD | Dependência externa; some no cardápio |
| S3 / CDN | Fora do Hostinger compartilhado do MVP |

## Consequências

- Redeploy não zera fotos já enviadas.
- `GET /v1/uploads/{file}` continua público (nome opaco).
