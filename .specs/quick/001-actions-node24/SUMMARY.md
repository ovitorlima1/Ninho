# 001 — resultado (2026-09-16)

- CI da branch `ci-actions-node24` verde: checks em 53 s, e2e em 2 min 46 s
  ([execução 35144278487](https://github.com/ovitorlima1/Ninho/actions/runs/35144278487)).
- Nenhuma anotação nos dois jobs (antes: aviso de Node 20 em cada um).
- Não exercitado: `actions/upload-artifact@v7`, que só roda quando o E2E falha. As entradas
  usadas (`name`, `path` em várias linhas, `retention-days`) não mudaram entre a v4 e a v7.
