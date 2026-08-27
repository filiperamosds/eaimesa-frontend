# Fatia 6 — Comandas individuais

Cada pessoa na mesa tem **a sua** comanda. O QR/PIN continua provando presença na mesa; nome + telefone abrem a conta da pessoa. O garçom vê a parcial por comanda e só encerra a mesa quando **todas** estão fechadas.

Pedido pelo cardápio (carrinho) está na [fatia 7](fatia-07-pedido-guest.md).

## Inclui

- **TableSession** — ocupação da mesa + PIN único do grupo
- **Tab** = comanda pessoal: `guest_name`, `guest_phone`, ligada à sessão da mesa
- Várias comandas `open` na mesma mesa
- Guest: após claim ou PIN, formulário nome + telefone (`/{slug}/comanda`) — máscara `(11) 98888-7777`; a API grava só dígitos
- Telefone único enquanto a comanda está `open`: mesmo número em **outra** mesa → 409 `TAB_ALREADY_OPEN`. Se o garçom já abriu a comanda **nesta** mesa com esse telefone, o guest retoma essa conta.
- Garçom `/garcom`: toque na mesa (livre ou ocupada) abre o **dialog**. Vê o **PIN**, abre comanda (nome + telefone), parcial com **A receber**, **Imprimir na térmica** (ESC/POS USB, [ADR-029](../decisions/ADR-029-cupom-escpos-usb.md)), lança pedido, fecha conta.
- Guest `/{slug}`: **Parcial** em dialog; `/{slug}/comanda` para abrir perfil ([fatia 9](fatia-09-parcial-guest.md))
- `POST /v1/staff/tables/{id}/tabs` — garçom abre comanda `{ name, phone }`
- `POST /v1/staff/orders` com `tabId` — garçom lança itens na comanda (dialog)
- `POST /v1/staff/tabs/{id}/close` — fecha uma comanda (UI destaca o valor a receber)
- `POST /v1/staff/tables/{id}/close` — encerra a mesa; **409** se ainda houver comanda aberta
- Telefone mascarado no painel do garçom (últimos 4 dígitos)

## Não inclui

- Pagamento / split (só conferência + close; sem gateway na conta da mesa)
- Cupom fiscal oficial (SAT/NFC-e) — o cupom na tela é **conferência**
- Travamento (`locked`) além do close

## Fluxo cliente

1. Garçom gera QR (mesa livre) ou a mesa já tem PIN.
2. Primeiro aparelho: redeem → PIN da **mesa** + nome e telefone → comanda pessoal.
3. Outros: PIN em `/{slug}/entrar` → nome e telefone. Mesmo número com comanda `open` → bloqueio.
4. Garçom **não** precisa de um QR por pessoa; PIN serve o grupo.

## Fluxo garçom

1. Toque na mesa abre o dialog (livre ou ocupada). PIN grande se a sessão existir.
2. **Abrir comanda**: nome + telefone. **Novo QR** para o cliente escanear. Os dois geram/mostram o PIN.
3. Cartão da mesa lista os **nomes**. O quadro recarrega sozinho.
4. Seleciona uma conta → **A receber** em destaque, itens e **Imprimir na térmica** (ESC/POS no USB; o Chrome pede a POS80 uma vez, ou em Configurações → Estabelecimento → **Configurar impressora**). Não use o diálogo do sistema na POS80: o Mac manda A4/PostScript e ela imprime código. **Adicionar pedido**: escolhe categorias (só aí há **Cancelar**), soma itens de várias categorias (ex. bebida + petisco) e **Lança** um pedido.
5. Fecha comanda por pessoa (caixa, dono, ou garçom se `staffCanCloseTabs`) — botão mostra o valor. **Encerrar mesa** só com zero comandas abertas.

## Por que não uma comanda só

Conta única mistura pedidos do grupo e impede fechar “a parte do João”. Presença (claim/PIN) é da mesa; dívida é da pessoa.

Ver [ADR-009](../decisions/ADR-009-comandas-individuais.md).
