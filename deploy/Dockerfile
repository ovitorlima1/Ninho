# Imagens do Ninho para a VPS. Contexto de build: a raiz do repositório.
#
#   api     → API (Node), bundle único do esbuild
#   web     → front estático no Nginx, que também repassa /api para a API
#   migrate → aplica o schema no banco (drizzle-kit push) e termina
#
# Debian (glibc) e linux/amd64 de propósito: o pnpm-workspace.yaml remove os
# binários musl e arm64 do esbuild, do rollup e do lightningcss.

FROM node:24-bookworm-slim AS deps
ENV CI=true
RUN npm install -g pnpm@11.17.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

# ── Builds ────────────────────────────────────────────────────────────────────
FROM deps AS build-api
RUN pnpm --filter @workspace/api-server run build

FROM deps AS build-web
# PORT só é exigido pelo vite.config; no build ele não abre porta nenhuma.
RUN PORT=8080 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/ninho run build

# ── Schema ────────────────────────────────────────────────────────────────────
FROM deps AS migrate
ENV NODE_ENV=production
# Sem terminal: se o drizzle pedir confirmação para apagar dados, o comando
# falha em vez de apagar. Mudança destrutiva é decisão de quem opera.
CMD ["pnpm", "--filter", "@workspace/db", "run", "push"]

# ── API ───────────────────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS api
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=build-api --chown=node:node /repo/artifacts/api-server/dist ./dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8080/api/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/index.mjs"]

# ── Front ─────────────────────────────────────────────────────────────────────
FROM nginxinc/nginx-unprivileged:1.29-bookworm AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-web /repo/artifacts/ninho/dist/public /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8080/nginx-health >/dev/null || exit 1
