# Fase 4 — validação (2026-09-16)

Branch `fase-0-correcoes-urgentes`, sem push.

## Gates (raiz do repositório)

| Gate | Resultado |
|---|---|
| `pnpm run typecheck` | 0 erros |
| `pnpm lint` | 0 problemas |
| `pnpm test` (Vitest) | 37 testes: front 20 + API 17 (tentativas 6, origem 6, sessão 3, logger 2) |
| `pnpm test:e2e` (Playwright + axe) | **54/54** — 27 cenários em 375 e 1280px (duas execuções seguidas verdes) |
| `PORT=5199 BASE_PATH=/ pnpm run build` | ok; JS inicial 76,38 kB gzip |
| Build com CSP (`vite preview` + API de dev) | fontes carregam, login chama a API, 0 violações no console |

## Critérios de aceite

| # | Critério | Resultado |
|---|---|---|
| 1 | Token reutilizado após sair → 401; sair de todos derruba outra sessão | ✅ E2E `account.spec.ts` (e a redefinição de senha também derruba) |
| 2 | Contadores no banco, com chave em hash; recuperação segue 3/h | ✅ E2E `auth.spec.ts` consulta `auth_attempts` |
| 3 | Cabeçalhos, sem `X-Powered-By`, 403 para outra origem | ✅ E2E `security.spec.ts` + Vitest de `isAllowedOrigin` |
| 4 | Exportação traz os itens; exclusão com senha errada não apaga; com a certa zera as 9 tabelas e o login falha | ✅ E2E com contagem de linhas por tabela |
| 5 | Nenhum `console.*` na API; nenhum erro em inglês | ✅ `grep` vazio; mensagens de `me.ts` traduzidas |
| 6 | Gates verdes | ✅ |

Também medido: login com e-mail inexistente responde em ~50 ms (o tempo do scrypt), igual a
uma senha errada.

## Commits

| Tarefa | Commit |
|---|---|
| T1 tabelas | `1d7d16a` |
| T2 sessões | `7247faa` |
| T3 limitador | `11bae31` |
| T4 HTTP | `22523ab` |
| T5 validação e logs | `b15a4d7` |
| T6 LGPD | `4f9b185` |

## Achados durante a fase

1. **Drizzle vaza os valores no texto do erro.** `DrizzleQueryError` põe `params: …` na mensagem
   e no stack, então `redact` não bastava; o serializador de erro (`lib/logger.ts`) corta o trecho.
2. **`Promise.all` dentro de transação** no seed gerava aviso do `pg` (vira erro no pg@9); as
   inserções agora são sequenciais.
3. **O sticky do "salvar perfil" vazava para diálogos** abertos no Perfil (botão colado no campo
   no celular); o seletor passou a ser `.profile-form > .primary-button`.
4. Na primeira execução do E2E depois de importar ícones novos, os servidores caíram no meio
   (provável reotimização de dependências do Vite); as três execuções seguintes passaram.

## Efeitos no deploy

- **Todo mundo precisa entrar de novo** depois do deploy: tokens antigos não têm `sid`.
- Rodar `pnpm --filter @workspace/db run push` em produção (duas tabelas novas, sem mudança nas existentes).
- Se o app for servido em outro domínio além do da API, listar em `ALLOWED_ORIGINS` (vírgulas);
  `PUBLIC_APP_URL` já é aceito.
- `frame-ancestors` não vale por `<meta>`: o front estático continua podendo ser embutido em
  iframe até o host permitir cabeçalhos próprios.

## Pendências do dono

- Política de privacidade e termos de uso (texto jurídico) — o app agora exporta e exclui dados,
  mas não há página explicando o tratamento.
- Monitoramento de erros (Sentry ou similar) exige conta externa.
