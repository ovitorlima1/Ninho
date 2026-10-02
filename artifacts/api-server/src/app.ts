import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { errSerializer, logger } from "./lib/logger";
import {
  errorHandler,
  noStore,
  notFound,
  requireSameOrigin,
  securityHeaders,
} from "./middlewares/security";

const app: Express = express();

// Só os proxies da frente podem dizer quem é o cliente (X-Forwarded-For): os
// limites de tentativa são por origem. Por padrão vale o loopback (proxy do
// Vite em desenvolvimento); em produção `TRUST_PROXY` nomeia a rede interna do
// Docker, por onde chegam o Traefik e o Nginx (ex.: "loopback, uniquelocal").
const trustedProxies = (process.env.TRUST_PROXY ?? "").split(",").map((value) => value.trim()).filter(Boolean);
app.set("trust proxy", trustedProxies.length > 0 ? trustedProxies : "loopback");
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      err: errSerializer,
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(securityHeaders);
// A API só fala JSON: sem parser de formulário, um <form> de outro site não
// consegue montar um corpo que ela aceite.
app.use(express.json({ limit: "64kb" }));
app.use("/api", requireSameOrigin);
app.use(["/api/me", "/api/auth"], noStore);

app.use("/api", router);
app.use(notFound);
app.use(errorHandler);

export default app;
