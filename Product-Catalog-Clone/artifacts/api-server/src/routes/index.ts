import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import consultantsRouter from "./consultants";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";
import portalRouter from "./portal";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(consultantsRouter);
router.use(ordersRouter);
router.use(dashboardRouter);
router.use(portalRouter);
router.use(settingsRouter);

export default router;
