import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import authRouter from "./auth";
import giftRouter from "./gift";
import accountRouter from "./account";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
// A conta vem antes: o router de /me aplica requireAuth a tudo que passa por ele.
router.use("/me", accountRouter);
router.use("/me", meRouter);
router.use("/gift", giftRouter);

export default router;
