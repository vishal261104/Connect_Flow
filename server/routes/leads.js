import { Router } from "express";
import { convertToLeadHandler, listLeadsHandler, updateLeadStageHandler } from "../controllers/leadsController.js";

const router = Router();

router.get("/", listLeadsHandler);
router.post("/:id/convert", convertToLeadHandler);
router.put("/:id", updateLeadStageHandler);

export default router;
