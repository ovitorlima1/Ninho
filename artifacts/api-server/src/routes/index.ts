import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import authRouter from "./auth";
import giftRouter from "./gift";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/me", meRouter);
router.use("/gift", giftRouter);

export default router;
