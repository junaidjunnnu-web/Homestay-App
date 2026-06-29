import { Router, type IRouter } from "express";
import authRouter from "./auth";
import bookingsRouter from "./bookings";
import healthRouter from "./health";
import housekeepingRouter from "./housekeeping";
import menuRouter from "./menu";
import notificationsRouter from "./notifications";
import paymentSettingsRouter from "./paymentSettings";
import propertiesRouter from "./properties";
import reviewsRouter from "./reviews";
import roomsRouter from "./rooms";
import staffRouter from "./staff";
import storageRouter from "./storage";
import transactionsRouter from "./transactions";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(propertiesRouter);
router.use(roomsRouter);
router.use(bookingsRouter);
router.use(reviewsRouter);
router.use(housekeepingRouter);
router.use(staffRouter);
router.use(menuRouter);
router.use(uploadRouter);
router.use(storageRouter);
router.use(paymentSettingsRouter);
router.use(transactionsRouter);
router.use(notificationsRouter);

export default router;
