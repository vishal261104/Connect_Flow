import { Router } from "express";
import { dashboardAnalyticsHandler, dashboardSummaryHandler } from "../controllers/dashboardController.js";

const router = Router();

router.get("/summary", dashboardSummaryHandler);
router.get("/analytics", dashboardAnalyticsHandler);

export default router;
