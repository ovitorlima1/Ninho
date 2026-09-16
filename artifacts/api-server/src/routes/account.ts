import { Router } from "express";
import { expiredSessionCookie } from "../lib/auth";
import { revokeAllSessions } from "../lib/sessions";
import { requireAuth } from "../middlewares/requireAuth";

/** Rotas da conta em si (sessões e LGPD), montadas em `/api/me`. */
const router = Router();

/** POST /api/me/sessions/revoke-all — encerra a conta em todos os aparelhos. */
router.post("/sessions/revoke-all", requireAuth, async (req, res) => {
  try {
    await revokeAllSessions(res.locals.userId as string);
  } catch (err) {
    req.log.error({ err }, "revoke all sessions error");
    res.status(500).json({ error: "Não foi possível sair dos aparelhos agora. Tente novamente." });
    return;
  }
  res.append("Set-Cookie", expiredSessionCookie());
  res.status(204).send();
});

export default router;
