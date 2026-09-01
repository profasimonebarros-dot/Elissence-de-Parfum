import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import consultantsRouter from "./consultants";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(consultantsRouter);
router.use(ordersRouter);
router.use(dashboardRouter);

export default router;
