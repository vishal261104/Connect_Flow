import { Router } from "express";
import { createTaskHandler, listTasksHandler, updateTaskHandler } from "../controllers/tasksController.js";

const router = Router({ mergeParams: true });

router.get("/", listTasksHandler);
router.post("/", createTaskHandler);
router.put("/:taskId", updateTaskHandler);

export default router;
