import { listUsersByWorkspace } from "../models/userModel.js";

export const listUsersHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		if (!workspaceId) return res.status(401).json({ message: "Unauthorized" });

		const users = await listUsersByWorkspace({ workspaceId });
		return res.json(
			(users ?? []).map((u) => ({
				id: Number(u.id),
				email: String(u.email ?? ""),
				role: String(u.role ?? "Viewer"),
				created_at: u.created_at,
			}))
		);
	} catch (err) {
		return next(err);
	}
};
