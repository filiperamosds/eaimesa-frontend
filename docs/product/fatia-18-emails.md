# Fatia 18 — E-mails e confirmação

Rotas no front único: `/confirmar-email`, `/esqueci-senha`, `/redefinir-senha`, `/convite` (token na query — export estático).

## Inclui

- Cadastro do dono: senha + confirmar; depois código 6 dígitos. Sem entrar no painel até confirmar. Trial começa na confirmação.
- Esqueci senha (dono e equipe com senha já criada): código + nova senha + confirmar.
- Convite de **novos** membros: dono só nome/e-mail/perfil; link no e-mail para criar senha.
- Contato `suporte@eaimesa.com` no rodapé. From do produto: `nao-responder@eaimesa.com` (API).
- Confirmar senha no cadastro, convite, reset e `/admin/equipe`.

## Como validar

`pnpm typecheck`. No Mac: cadastrar → e-mail/log → código → painel; convite sem senha no form da equipe.
