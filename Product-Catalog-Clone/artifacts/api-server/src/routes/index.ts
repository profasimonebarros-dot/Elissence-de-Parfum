import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import consultantsRouter from "./consultants";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";
import portalRouter from "./portal";
import infinitepayRouter from "./payments-infinitepay";
import settingsRouter from "./settings";
import authRouter from "./auth";
import pushRouter from "./push";
import usersRouter from "./users";
import { requireAuth } from "../middleware/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(portalRouter);
router.use(infinitepayRouter);
router.use(settingsRouter);
router.use(authRouter);
router.use(pushRouter);
router.use(requireAuth, productsRouter);
router.use(requireAuth, consultantsRouter);
router.use(requireAuth, ordersRouter);
router.use(requireAuth, dashboardRouter);
router.use(usersRouter);

export default router;