import crypto from "node:crypto";
import { createUser, getUserByEmail, getUserById } from "../models/userModel.js";
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
		const email = normalizeEmail(req.body?.email);
		const password = String(req.body?.password ?? "");
		if (!email) return res.status(400).json({ message: "Email is required" });
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return res.status(400).json({ message: "Invalid email format" });
		}

		const existing = await getUserByEmail(email);
		if (existing) return res.status(409).json({ message: "Email already exists" });

		const passwordHash = await hashPassword(password);
		const user = await createUser({ email, passwordHash });
		const { token } = await createUserSession({ userId: user.id });
		return res.status(201).json({ token, user: { id: user.id, email: user.email } });
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
		return res.json({ token, user: { id: user.id, email: user.email } });
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
		return res.json({ id: user.id, email: user.email });
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
