# Fatia 23 — Fotos do cardápio no backend

O dono envia a foto no painel; o arquivo fica no disco da API e o item guarda só o path. Deploy não apaga o que já foi enviado.

## Inclui

- `POST /v1/owner/catalog/items/{id}/image` → `storage/app/private/uploads` + `image_url` = `/v1/uploads/{uuid}.ext`
- `GET /v1/uploads/{file}` público (nome UUID)
- Create/patch de item **não** aceitam `imageUrl` externo; foto só via upload
- Deploy: tarball exclui uploads; SSH faz backup/restore como o `.env`

## Não inclui

- CDN / S3
- Trocar o seed demo (Unsplash e `/seed/` continuam só no seeder local)

Ver [ADR-042](../decisions/ADR-042-imagens-backend.md).
