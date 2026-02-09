import crypto from "node:crypto";
import { getUserSessionByToken } from "../models/sessionModel.js";

const sha256Hex = (value) => crypto.createHash("sha256").update(value).digest("hex");

const parseBearerToken = (headerValue) => {
	const raw = String(headerValue ?? "").trim();
	if (!raw) return null;
	const [scheme, token] = raw.split(" ");
	if (scheme?.toLowerCase() !== "bearer" || !token) return null;
	return token.trim() || null;
};

export const requireAuth = async (req, res, next) => {
	try {
		const token = parseBearerToken(req.headers.authorization);
		if (!token) return res.status(401).json({ message: "Unauthorized" });

		const session = await getUserSessionByToken({ tokenHash: sha256Hex(token) });
		if (!session) return res.status(401).json({ message: "Unauthorized" });

		req.user = { id: Number(session.user_id), email: session.email };
		return next();
	} catch (err) {
		return next(err);
	}
};
