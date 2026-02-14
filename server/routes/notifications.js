import { Router } from "express";
import {
	listNotificationsHandler,
	markAllReadHandler,
	markReadHandler,
	unreadCountHandler,
} from "../controllers/notificationsController.js";

const router = Router();

router.get("/", listNotificationsHandler);
router.get("/unread-count", unreadCountHandler);
router.put("/:id/read", markReadHandler);
router.post("/mark-all-read", markAllReadHandler);

export default router;
