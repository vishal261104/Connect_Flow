import { getWorkspaceById } from "../models/workspacesModel.js";
import { createUserInWorkspace, getUserByEmail, listUsersByWorkspace } from "../models/userModel.js";
import { hashPassword } from "../utils/password.js";

const parseId = (value) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) return null;
	return parsed;
};

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const normalizeRole = (value) => {
	const raw = String(value ?? "").trim();
	if (!raw) return null;
	const normalized = raw[0].toUpperCase() + raw.slice(1).toLowerCase();
	return normalized;
};

const isAllowedRole = (role) => role === "Admin" || role === "Sales" || role === "Viewer";

export const listWorkspaceUsersHandler = async (req, res, next) => {
	try {
		const workspaceId = parseId(req.params.id);
		if (!workspaceId) return res.status(400).json({ message: "Invalid workspace id" });

		const workspace = await getWorkspaceById({ id: workspaceId });
		if (!workspace) return res.status(404).json({ message: "Workspace not found" });

		const users = await listUsersByWorkspace({ workspaceId });
		return res.json(
			(users ?? []).map((u) => ({
				id: Number(u.id),
				email: String(u.email ?? ""),
				name: u.name ?? null,
				role: String(u.role ?? "Viewer"),
				created_at: u.created_at,
			}))
		);
	} catch (err) {
		return next(err);
	}
};

export const createWorkspaceUserHandler = async (req, res, next) => {
	try {
		const workspaceId = parseId(req.params.id);
		if (!workspaceId) return res.status(400).json({ message: "Invalid workspace id" });

		const workspace = await getWorkspaceById({ id: workspaceId });
		if (!workspace) return res.status(404).json({ message: "Workspace not found" });

		const name = String(req.body?.name ?? "").trim();
		const email = normalizeEmail(req.body?.email);
		const password = String(req.body?.password ?? "");
		const role = normalizeRole(req.body?.role);

		if (!name) return res.status(400).json({ message: "Name is required" });
		if (!email) return res.status(400).json({ message: "Email is required" });
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return res.status(400).json({ message: "Invalid email format" });
		}
		if (!password || password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
		if (!role || !isAllowedRole(role)) {
			return res.status(400).json({ message: "Role must be one of: Admin, Sales, Viewer" });
		}

		const existing = await getUserByEmail(email);
		if (existing) return res.status(409).json({ message: "Email already exists" });

		const passwordHash = await hashPassword(password);
		const created = await createUserInWorkspace({ workspaceId, email, passwordHash, name, role });
		return res.status(201).json({
			id: created.id,
			email: created.email,
			name: created.name ?? null,
			workspaceId: Number(created.workspace_id),
			role: String(created.role ?? "Viewer"),
			created_at: created.created_at,
		});
	} catch (err) {
		return next(err);
	}
};
