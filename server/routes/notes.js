import { Router } from "express";
import {
	addNoteHandler,
	deleteNoteHandler,
	listNotesHandler,
	updateNoteHandler,
} from "../controllers/notesController.js";

const router = Router({ mergeParams: true });

router.get("/", listNotesHandler);
router.post("/", addNoteHandler);
router.put("/:noteId", updateNoteHandler);
router.delete("/:noteId", deleteNoteHandler);

export default router;
