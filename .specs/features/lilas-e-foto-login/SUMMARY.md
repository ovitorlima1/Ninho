# Paleta lilás e foto no login — validação (2026-09-17)

## Contrastes medidos (WCAG 2.2)

| Par | Contraste | Uso |
|---|---|---|
| `#24202a` sobre `#f6f4f9` | 14,6:1 | texto |
| `#6b6573` sobre `#f6f4f9` / `#f1edf5` | 5,15:1 / 4,87:1 | texto de apoio |
| `#8a44bb` sobre branco / fundo / `#f1e4fb` | 5,79:1 / 5,30:1 / 4,75:1 | links, texto roxo, seleção |
| branco sobre `#9851d0` → `#7e3fae` | 4,75:1 ou mais | botão principal (degradê) |
| `#8f879a` sobre branco | 3,44:1 | borda de campo (mín. 3:1) |
| `#3f6b53` sobre `#eaf5ed` | 5,46:1 | sucesso |
| `#9b3f52` sobre `#f9edf2` | 5,71:1 | erro |
| `#8a5a1f` sobre `#fbeedd` | 5,16:1 | alerta |
| `#6b6573` sobre `#f1e4fb` | 4,61:1 | apoio na caixa "semana gestacional" |
| `#e0a4fb` sobre `#583767` | 5,04:1 | "com leveza." no painel escuro |
| Antigos, não usados como texto | `#a453d1` 4,06:1 no fundo; degradê `#bd70ed` 3,13:1 com branco | — |

## Gates

| Gate | Resultado |
|---|---|
| `pnpm lint` / `typecheck` | 0 |
| `pnpm test` | 37 (front 20, API 17) |
| `pnpm test:e2e` (com axe) | 54/54 (portas 8791/5191: a 5190 estava ocupada por outro projeto) |
| Build + `vite preview` com a CSP | Montserrat e Space Mono carregam, foto carrega, console limpo |

## Conferido na tela

Login (1280 e 375 px), Início, Lista, Marcos, Orçamento e Perfil. No Perfil, a caixa "semana gestacional" saiu do verde (é informação, não sucesso) para o lilás claro. O véu do painel escurece mais a parte
de baixo, onde fica o texto sobre o vestido claro da foto.

Na captura tirada no meio do toque, o botão "comprei" aparece roxo sobre roxo — é a transição de
cor; em repouso fica branco sobre `#8a44bb`.

## Troca da foto (2026-09-18)

O dono não gostou da primeira foto (Unsplash, ao ar livre). A nova, do Pexels, é mais escura
(parede azul-acinzentada), então a parte de cima do véu ficou mais leve (o rosto aparecia apagado)
e a de baixo continua escura para o texto. O recorte foi ajustado ao rosto nos dois tamanhos.

## Arquivos

- `styles/tokens.css` (paleta, fontes, sombras, véu), `styles/base.css` (espaçamento dos títulos),
  `styles/components.css` (etiquetas em Space Mono, botão em degradê, painel do login com foto,
  fita em lilás, cartão suave em lilás), `index.html` (fontes e `theme-color`),
  `features/auth/auth-layout.tsx` (foto), `public/images/login-gestante.jpg` (214 kB, 1200×1800,
  Jonathan Borba no Pexels).
- Apagado: `public/login-pregnancy.png`.
- `playwright.config.ts`: portas do E2E configuráveis (`E2E_API_PORT`, `E2E_WEB_PORT`).
