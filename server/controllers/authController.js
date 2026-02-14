import crypto from "node:crypto";
import {
	createUser,
	getUserAuthById,
	getUserByEmail,
	getUserById,
	updateUserName,
	updateUserPassword,
} from "../models/userModel.js";
import { createUserSession, deleteUserSessionByTokenHash } from "../models/sessionModel.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const sha256Hex = (value) => crypto.createHash("sha256").update(value).digest("hex");

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const parseBearerToken = (headerValue) => {
	const raw = String(headerValue ?? "").trim();
	if (!raw) return null;
	const [scheme, token] = raw.split(" ");
	if (scheme?.toLowerCase() !== "bearer" || !token) return null;
	return token.trim() || null;
};

export const registerHandler = async (req, res, next) => {
	try {
		const name = String(req.body?.name ?? "").trim();
		const email = normalizeEmail(req.body?.email);
		const password = String(req.body?.password ?? "");
		if (!name) return res.status(400).json({ message: "Name is required" });
		if (!email) return res.status(400).json({ message: "Email is required" });
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return res.status(400).json({ message: "Invalid email format" });
		}
		if (!password || password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

		const existing = await getUserByEmail(email);
		if (existing) return res.status(409).json({ message: "Email already exists" });

		const passwordHash = await hashPassword(password);
		const created = await createUser({ email, passwordHash, name });
		const user = await getUserById(created.id);
		const { token } = await createUserSession({ userId: user.id });
		return res.status(201).json({
			token,
			user: {
				id: user.id,
				email: user.email,
				name: user.name ?? null,
				workspaceId: Number(user.workspace_id),
				role: String(user.role ?? "").trim() || "Viewer",
			},
		});
	} catch (err) {
		return next(err);
	}
};

export const loginHandler = async (req, res, next) => {
	try {
		const email = normalizeEmail(req.body?.email);
		const password = String(req.body?.password ?? "");
		if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

		const user = await getUserByEmail(email);
		if (!user) return res.status(401).json({ message: "Invalid credentials" });

		const ok = await verifyPassword(password, user.password_hash);
		if (!ok) return res.status(401).json({ message: "Invalid credentials" });

		const { token } = await createUserSession({ userId: user.id });
		return res.json({
			token,
			user: {
				id: user.id,
				email: user.email,
				name: user.name ?? null,
				workspaceId: Number(user.workspace_id),
				role: String(user.role ?? "").trim() || "Viewer",
			},
		});
	} catch (err) {
		return next(err);
	}
};

export const meHandler = async (req, res, next) => {
	try {
		const userId = Number(req.user?.id);
		if (!userId) return res.status(401).json({ message: "Unauthorized" });
		const user = await getUserById(userId);
		if (!user) return res.status(401).json({ message: "Unauthorized" });
		return res.json({
			id: user.id,
			email: user.email,
			name: user.name ?? null,
			workspaceId: Number(user.workspace_id),
			role: String(user.role ?? "").trim() || "Viewer",
		});
	} catch (err) {
		return next(err);
	}
};

export const updateMeHandler = async (req, res, next) => {
	try {
		const userId = Number(req.user?.id);
		if (!userId) return res.status(401).json({ message: "Unauthorized" });

		const name = String(req.body?.name ?? "").trim();
		if (!name) return res.status(400).json({ message: "Name is required" });

		const updated = await updateUserName({ userId, name });
		if (!updated) return res.status(401).json({ message: "Unauthorized" });

		return res.json({
			id: updated.id,
			email: updated.email,
			name: updated.name ?? null,
			workspaceId: Number(updated.workspace_id),
			role: String(updated.role ?? "").trim() || "Viewer",
		});
	} catch (err) {
		return next(err);
	}
};

export const changePasswordHandler = async (req, res, next) => {
	try {
		const userId = Number(req.user?.id);
		if (!userId) return res.status(401).json({ message: "Unauthorized" });

		const currentPassword = String(req.body?.currentPassword ?? "");
		const newPassword = String(req.body?.newPassword ?? "");
		if (!currentPassword) return res.status(400).json({ message: "Current password is required" });
		if (!newPassword || newPassword.length < 6) {
			return res.status(400).json({ message: "New password must be at least 6 characters" });
		}
		if (newPassword === currentPassword) {
			return res.status(400).json({ message: "New password must be different" });
		}

		const user = await getUserAuthById(userId);
		if (!user) return res.status(401).json({ message: "Unauthorized" });

		const ok = await verifyPassword(currentPassword, user.password_hash);
		if (!ok) return res.status(401).json({ message: "Current password is incorrect" });

		const passwordHash = await hashPassword(newPassword);
		await updateUserPassword({ userId, passwordHash });
		return res.json({ ok: true });
	} catch (err) {
		return next(err);
	}
};

export const logoutHandler = async (req, res, next) => {
	try {
		const token = parseBearerToken(req.headers.authorization);
		if (!token) return res.status(204).send();
		await deleteUserSessionByTokenHash({ tokenHash: sha256Hex(token) });
		return res.status(204).send();
	} catch (err) {
		return next(err);
	}
};
