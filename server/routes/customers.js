import { Router } from "express";
import {
	createCustomerHandler,
	deleteCustomerHandler,
	getCustomerHandler,
	listCustomersHandler,
	updateCustomerHandler,
	verifyCustomerEmailHandler,
} from "../controllers/customerController.js";

import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/verify-email", verifyCustomerEmailHandler);
router.use(requireAuth);
router.get("/", listCustomersHandler);
router.post("/", createCustomerHandler);
router.get("/:id", getCustomerHandler);
router.put("/:id", updateCustomerHandler);
router.delete("/:id", deleteCustomerHandler);

export default router;
