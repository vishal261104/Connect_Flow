import { Router } from "express";
import { listUsersHandler } from "../controllers/usersController.js";

const router = Router();

router.get("/", listUsersHandler);

export default router;
