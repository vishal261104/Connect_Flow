import { getCustomerById } from "../models/customerModel.js";
import { addNote, deleteNoteForCustomer, listNotesByCustomer, updateNote } from "../models/notesModel.js";
import { createActivity } from "../models/activitiesModel.js";

const parseId = (value) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) return null;
	return parsed;
};

export const listNotesHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const customerId = parseId(req.params.customerId);
		if (!customerId) return res.status(400).json({ message: "Invalid customer id" });

		const customer = await getCustomerById(workspaceId, customerId);
		if (!customer) return res.status(404).json({ message: "Customer not found" });

		const notes = await listNotesByCustomer(workspaceId, customerId);
		return res.json(notes);
	} catch (err) {
		return next(err);
	}
};

export const addNoteHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const actorUserId = Number(req.user?.id);
		const customerId = parseId(req.params.customerId);
		if (!customerId) return res.status(400).json({ message: "Invalid customer id" });

		const { body } = req.body ?? {};
		if (!body || typeof body !== "string" || !body.trim()) {
			return res.status(400).json({ message: "Note body is required" });
		}

		const customer = await getCustomerById(workspaceId, customerId);
		if (!customer) return res.status(404).json({ message: "Customer not found" });

		const note = await addNote({ workspaceId, actorUserId, customerId, body: body.trim() });
		await createActivity({
			workspaceId,
			customerId,
			actorUserId,
			type: "NOTE_ADDED",
			data: { noteId: Number(note.id) },
		});
		return res.status(201).json(note);
	} catch (err) {
		return next(err);
	}
};

export const updateNoteHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const actorUserId = Number(req.user?.id);
		const customerId = parseId(req.params.customerId);
		if (!customerId) return res.status(400).json({ message: "Invalid customer id" });

		const noteId = parseId(req.params.noteId);
		if (!noteId) return res.status(400).json({ message: "Invalid note id" });

		const { body } = req.body ?? {};
		if (!body || typeof body !== "string" || !body.trim()) {
			return res.status(400).json({ message: "Note body is required" });
		}

		const customer = await getCustomerById(workspaceId, customerId);
		if (!customer) return res.status(404).json({ message: "Customer not found" });

		const updated = await updateNote({ workspaceId, actorUserId, noteId, customerId, body: body.trim() });
		if (!updated) return res.status(404).json({ message: "Note not found" });
		await createActivity({
			workspaceId,
			customerId,
			actorUserId,
			type: "NOTE_UPDATED",
			data: { noteId: Number(noteId) },
		});
		return res.json(updated);
	} catch (err) {
		return next(err);
	}
};

export const deleteNoteHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const customerId = parseId(req.params.customerId);
		if (!customerId) return res.status(400).json({ message: "Invalid customer id" });

		const noteId = parseId(req.params.noteId);
		if (!noteId) return res.status(400).json({ message: "Invalid note id" });

		const customer = await getCustomerById(workspaceId, customerId);
		if (!customer) return res.status(404).json({ message: "Customer not found" });

		const deleted = await deleteNoteForCustomer({ workspaceId, noteId, customerId });
		if (!deleted) return res.status(404).json({ message: "Note not found" });
		await createActivity({
			workspaceId,
			customerId,
			actorUserId: Number(req.user?.id),
			type: "NOTE_DELETED",
			data: { noteId: Number(noteId) },
		});
		return res.status(204).send();
	} catch (err) {
		return next(err);
	}
};
