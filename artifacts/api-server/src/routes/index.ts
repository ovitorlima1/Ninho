import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/me", meRouter);

export default router;
