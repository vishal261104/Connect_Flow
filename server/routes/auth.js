import { Router } from "express";
import {
	updateMeHandler,
	changePasswordHandler,
	loginHandler,
	logoutHandler,
	meHandler,
	registerHandler,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.get("/me", requireAuth, meHandler);
router.put("/me", requireAuth, updateMeHandler);
router.put("/password", requireAuth, changePasswordHandler);
router.post("/logout", requireAuth, logoutHandler);

export default router;
