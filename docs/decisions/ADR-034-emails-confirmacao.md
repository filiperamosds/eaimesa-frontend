# ADR-034 — E-mails transacionais (código, convite, cron)

## Status

Aceito

## Contexto

O cadastro do dono entrava no painel (e no trial) sem provar o e-mail. Equipe nascia com senha definida pelo dono.

## Decisão

- Código 6 dígitos / 15 min no cadastro do dono e no reset. Convite de novos staff: **link** `/convite?token=` (query: `output: "export"` não gera `[token]`).
- Trial e sessão só depois de confirmar. From `nao-responder@eaimesa.com`, sem Reply-To. `suporte@eaimesa.com` no rodapé.
- Cron é da **API** (`php artisan schedule:run` na pasta Laravel). Não usar `wget` / `wp-cron.php` no `public_html` do Next.

## Consequências

- Novas rotas reservadas: `confirmar-email`, `esqueci-senha`, `redefinir-senha`, `convite`.
- `POST /v1/owner/staff` sem `password`.
