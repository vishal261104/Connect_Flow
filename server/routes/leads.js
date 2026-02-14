import { Router } from "express";
import { convertToLeadHandler, listLeadsHandler, updateLeadStageHandler } from "../controllers/leadsController.js";
import { canWrite } from "../middleware/rbac.js";

const router = Router();

router.get("/", listLeadsHandler);
router.post("/:id/convert", canWrite, convertToLeadHandler);
router.put("/:id", canWrite, updateLeadStageHandler);

export default router;
