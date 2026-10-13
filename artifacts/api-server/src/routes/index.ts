import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import authRouter from "./auth";
import giftRouter from "./gift";
import accountRouter from "./account";
import listsRouter from "./lists";
import checklistsRouter from "./checklists";
import publicListsRouter from "./lists-public";
import mediaRouter from "./media";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
// A conta vem antes: o router de /me aplica requireAuth a tudo que passa por ele.
router.use("/me", accountRouter);
router.use("/me", listsRouter);
router.use("/me", checklistsRouter);
router.use("/me", meRouter);
router.use("/gift", giftRouter);
router.use("/lists", publicListsRouter);
router.use("/media", mediaRouter);

export default router;
