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
import { adminOnly, canWrite } from "../middleware/rbac.js";

const router = Router();

router.get("/verify-email", verifyCustomerEmailHandler);
router.use(requireAuth);
router.get("/", listCustomersHandler);
router.post("/", canWrite, createCustomerHandler);
router.get("/:id", getCustomerHandler);
router.put("/:id", canWrite, updateCustomerHandler);
router.delete("/:id", adminOnly, deleteCustomerHandler);

export default router;
