# TESTING — Ninho

## Estado atual (snapshot de 2026-09-11, ~19h)

O repositório está sendo alterado agora pela Fase 0 de correções; o que segue
vale para o commit `e094dec` + as mudanças ainda não commitadas na árvore.

- **Dois arquivos de teste**, ambos com `node:test` + `node:assert/strict`,
  sem framework:
  - `artifacts/ninho/src/lib/recommendations.test.ts` — 6 testes (era 4 antes do
    `fix(C4)`, que somou o clamp do timer e o alerta de validade < 14 dias);
  - `artifacts/api-server/src/lib/auth.test.ts` — 5 testes dos limitadores de
    reset de senha (**não commitado** no momento desta escrita, junto do script
    `test` em `artifacts/api-server/package.json`).
- **Não existe** teste de componente React, E2E, cobertura, lint ou CI
  (`.github/` não existe; `.replit` só define build/deploy/postMerge).
- `artifacts/ninho/tsconfig.json` **exclui** `**/*.test.ts`, então o typecheck
  não cobre os testes — quem valida a tipagem deles é o próprio script de teste.

## Gates que existem hoje (todos executados nesta sessão)

| Gate | Comando | Resultado |
|---|---|---|
| Typecheck | `pnpm run typecheck` | ✅ ok (~2 s): `tsc --build` das libs + `--noEmit` em ninho, api-server, mockup-sandbox, scripts |
| Teste do catálogo | `pnpm --filter @workspace/ninho run test:recommendations` | ✅ 6/6 (0 falhas, ~62 ms) |
| Teste da API (novo) | `pnpm --filter @workspace/api-server run test` | ✅ 5/5 (0 falhas, ~67 ms) |
| Build web | `PORT=5180 BASE_PATH=/ pnpm --filter @workspace/ninho run build` | ✅ ok: 1775 módulos, `index.js` 417,70 kB (gzip 129,98) e `index.css` 151,82 kB (gzip 28,89) |
| Build API (extra) | `pnpm --filter @workspace/api-server run build` | ✅ ok (esbuild, ~161 ms) |

Observações dos gates:
- `pnpm run build` na raiz = `typecheck` + `build` de todos os pacotes; o build do
  ninho exige `PORT` e `BASE_PATH` (o `vite.config.ts` lança erro se faltarem).
- O build emite um aviso benigno de sourcemap em `src/components/ui/tooltip.tsx`.
- Nenhum gate precisa de banco. Subir a API de verdade precisa de `DATABASE_URL`
  e `SESSION_SECRET` (`pnpm db:up` + `pnpm dev`).

## O script de teste, na íntegra

`artifacts/ninho/package.json`:

```
"test:recommendations": "rm -rf /tmp/ninho-recommendation-tests && tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --esModuleInterop --skipLibCheck --outDir /tmp/ninho-recommendation-tests src/lib/recommendations.ts src/lib/recommendations.test.ts && node --test /tmp/ninho-recommendation-tests/recommendations.test.js"
```

Ou seja: compila **apenas os dois arquivos citados** para `/tmp`, fora do
`tsconfig.json` do pacote, e roda o runner nativo do Node sobre o `.js` gerado.

O que os 6 testes cobrem (`recommendations.test.ts`): recomendação vigente
permanece visível; expirada, oculta (`visibility: "hidden"`) e com URL insegura
(`javascript:`) são filtradas; item expirado já vinculado continua indisponível;
a URL da loja some ao cruzar a fronteira de expiração; o atraso de refresh é
limitado a 1 h; e um teste falha quando algum item do catálogo tem menos de
14 dias de validade. Depois do `fix(C4)` as datas são derivadas do próprio
catálogo em vez de fixadas no teste.

`artifacts/api-server/src/lib/auth.test.ts` usa o mesmo padrão (script `test` no
pacote, compila `src/lib/auth.ts` + o teste para `/tmp/ninho-api-server-tests`) e
cobre os limitadores de reset de senha: 3 pedidos/hora por e-mail, 10/hora por
origem, `retryAfterSeconds` positivo ao bloquear, liberação após a janela e
independência entre os dois limitadores. Como os limitadores são singletons de
processo, cada teste usa chaves próprias em vez de resetar estado global.

## Como adicionar um novo teste unitário puro em `src/lib`

Mesmo padrão, um script por módulo:

1. Criar `src/lib/<modulo>.test.ts` importando com extensão `.js`
   (`import { calcGestationalWeek } from "./gestation.js";`) — obrigatório por
   causa de `--module NodeNext`.
2. O módulo sob teste precisa ser TS puro: sem JSX, sem alias `@/`, sem
   `import.meta.env`, sem DOM (o alias e o `env` só existem no bundle do Vite).
   Candidatos atuais: `src/lib/gestation.ts` e funções puras extraídas de `App.tsx`.
3. Adicionar em `artifacts/ninho/package.json`:
   ```
   "test:gestation": "rm -rf /tmp/ninho-gestation-tests && tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --esModuleInterop --skipLibCheck --outDir /tmp/ninho-gestation-tests src/lib/gestation.ts src/lib/gestation.test.ts && node --test /tmp/ninho-gestation-tests/gestation.test.js"
   ```
4. Rodar com `pnpm --filter @workspace/ninho run test:gestation`.

Melhoria óbvia (ainda não feita): um único `test:unit` que compile `src/lib/*.ts`
para uma pasta temporária e rode `node --test <dir>` — evita um script por módulo.
Testes com data devem receber o `now` por parâmetro (como o catálogo já faz) para
não quebrarem com a passagem do tempo.

## `api-server`: runner recém-introduzido, cobertura mínima

Antes da Fase 0 o pacote não tinha nenhum teste; hoje tem o script `test`
(mesmo padrão tsc→`/tmp`→`node --test`, sem framework, sem dependência nova).
Só `src/lib/auth.ts` é coberto. Próximos alvos **puros** (não precisam de banco):
`createSessionToken`/`verifySessionToken`, `hashPassword`/`verifyPassword`,
`parseCookieHeader`, `sessionCookie` (`src/lib/auth.ts`).

Teste de rota exige Postgres: `@workspace/db` lança na importação se
`DATABASE_URL` não estiver definido (`lib/db/src/index.ts`) — usar o
`docker-compose.dev.yml` (porta 5460) + `SESSION_SECRET` de teste. Alternativa
sem compilar: `tsx --test` (o `tsx` já é devDependency do pacote).
