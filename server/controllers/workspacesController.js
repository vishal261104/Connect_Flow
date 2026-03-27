import { createWorkspace, listWorkspaces } from "../models/workspacesModel.js";

const parseId = (value) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) return null;
	return parsed;
};

export const listWorkspacesHandler = async (req, res, next) => {
	try {
		const workspaces = await listWorkspaces();
		return res.json(workspaces);
	} catch (err) {
		return next(err);
	}
};

export const createWorkspaceHandler = async (req, res, next) => {
	try {
		const name = String(req.body?.name ?? "").trim();
		if (!name) return res.status(400).json({ message: "Workspace name is required" });

		const created = await createWorkspace({ name });
		return res.status(201).json(created);
	} catch (err) {
		return next(err);
	}
};

export const getWorkspaceIdParam = (req, res) => {
	const workspaceId = parseId(req.params.id);
	if (!workspaceId) {
		res.status(400).json({ message: "Invalid workspace id" });
		return null;
	}
	return workspaceId;
};
