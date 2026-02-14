import { Router } from "express";
import {
	addNoteHandler,
	deleteNoteHandler,
	listNotesHandler,
	updateNoteHandler,
} from "../controllers/notesController.js";
import { canWrite } from "../middleware/rbac.js";

const router = Router({ mergeParams: true });

router.get("/", listNotesHandler);
router.post("/", canWrite, addNoteHandler);
router.put("/:noteId", canWrite, updateNoteHandler);
router.delete("/:noteId", canWrite, deleteNoteHandler);

export default router;
