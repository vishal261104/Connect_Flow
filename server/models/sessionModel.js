import crypto from "node:crypto";
import { query } from "../config/db.js";

const sha256Hex = (value) => crypto.createHash("sha256").update(value).digest("hex");

export const createUserSession = async ({ userId, ttlDays = 30 }) => {
	const token = crypto.randomBytes(32).toString("hex");
	const tokenHash = sha256Hex(token);
	const result = await query(
		`
			INSERT INTO user_sessions (user_id, token_hash, expires_at)
			VALUES ($1, $2, NOW() + ($3 || ' days')::interval)
			RETURNING id, user_id, expires_at;
		`,
		[userId, tokenHash, String(ttlDays)]
	);
	return { token, session: result.rows[0] };
};

export const getUserSessionByToken = async ({ tokenHash }) => {
	const result = await query(
		`
			SELECT s.id, s.user_id, u.email, s.expires_at
			FROM user_sessions s
			JOIN users u ON u.id = s.user_id
			WHERE s.token_hash = $1
			  AND s.expires_at > NOW()
			LIMIT 1;
		`,
		[tokenHash]
	);
	return result.rows[0] ?? null;
};

export const deleteUserSessionByTokenHash = async ({ tokenHash }) => {
	const result = await query(
		`
			DELETE FROM user_sessions
			WHERE token_hash = $1
			RETURNING id;
		`,
		[tokenHash]
	);
	return (result.rowCount ?? 0) > 0;
};
