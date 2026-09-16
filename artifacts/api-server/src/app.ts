import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  errorHandler,
  noStore,
  notFound,
  requireSameOrigin,
  securityHeaders,
} from "./middlewares/security";

const app: Express = express();

// The managed proxy reaches the service through loopback. Trust only that
// address so a direct client cannot forge X-Forwarded-For to bypass limits.
app.set("trust proxy", "loopback");
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
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
