import { Router } from "express";
import { createWorkspaceHandler, listWorkspacesHandler } from "../controllers/workspacesController.js";
import { createWorkspaceUserHandler, listWorkspaceUsersHandler } from "../controllers/workspaceUsersController.js";
import { adminOnly } from "../middleware/rbac.js";

const router = Router();

// System-admin style: any Admin can list/create workspaces.
router.get("/", adminOnly, listWorkspacesHandler);
router.post("/", adminOnly, createWorkspaceHandler);

router.get("/:id/users", adminOnly, listWorkspaceUsersHandler);
router.post("/:id/users", adminOnly, createWorkspaceUserHandler);

export default router;
