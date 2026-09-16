# 001 — Actions do CI em Node 24

**Pedido (2026-09-16):** atualizar as actions do CI que o GitHub marcou como Node 20 (depreciado).

**Onde:** `.github/workflows/ci.yml`.

**O quê:** subir cada action para a versão principal mais recente, que já roda em Node 24:

| Action | Antes | Depois | Runtime conferido no `action.yml` |
|---|---|---|---|
| `actions/checkout` | v4 | v7 | node24 |
| `pnpm/action-setup` | v4 | v6 | node24 |
| `actions/setup-node` | v4 | v7 | node24 |
| `actions/upload-artifact` | v4 | v7 | node24 (a v4 também era node20; não aparecia no aviso porque só roda quando o E2E falha) |

**Mudanças que poderiam afetar o workflow (notas de versão lidas):**
- setup-node v6: o cache automático passou a valer só para npm — aqui o `cache: pnpm` é explícito, então continua.
- pnpm/action-setup v5/v6: runtime Node 24 e suporte ao pnpm 11/12; entradas iguais (`version`).
- checkout v5–v7 e upload-artifact v5–v7: runtime e dependências; nenhuma entrada usada mudou.

**Pronto quando:** o CI roda verde sem o aviso de Node 20.
