import { Router } from "express";
import { createTaskHandler, listTasksHandler, updateTaskHandler } from "../controllers/tasksController.js";
import { canWrite } from "../middleware/rbac.js";

const router = Router({ mergeParams: true });

router.get("/", listTasksHandler);
router.post("/", canWrite, createTaskHandler);
router.put("/:taskId", canWrite, updateTaskHandler);

export default router;
