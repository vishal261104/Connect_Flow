import { Router } from "express";
import { listCustomerActivitiesHandler } from "../controllers/activitiesController.js";

const router = Router({ mergeParams: true });

router.get("/", listCustomerActivitiesHandler);

export default router;
