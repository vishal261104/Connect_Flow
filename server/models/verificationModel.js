import crypto from "node:crypto";
import { query } from "../config/db.js";

const sha256Hex = (value) => crypto.createHash("sha256").update(value).digest("hex");

export const createCustomerEmailVerification = async ({ email, payload, ttlMinutes = 30 }) => {
	const token = crypto.randomBytes(32).toString("hex");
	const tokenHash = sha256Hex(token);

	const ownerUserId = payload?.owner_user_id ?? null;

	// Keep one active pending verification per email + user (best-effort cleanup).
	await query(
		`
			DELETE FROM customer_email_verifications
			WHERE LOWER(email) = LOWER($1)
			  AND (user_id = $2 OR ($2 IS NULL AND user_id IS NULL))
			  AND used_at IS NULL;
		`,
		[email, ownerUserId]
	);

	const result = await query(
		`
			INSERT INTO customer_email_verifications (email, token_hash, payload, expires_at, user_id)
			VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval, $5)
			RETURNING id, email, expires_at, user_id;
		`,
		[email, tokenHash, payload, String(ttlMinutes), ownerUserId]
	);

	return { token, verification: result.rows[0] };
};

export const consumeCustomerEmailVerification = async ({ token }) => {
	const tokenHash = sha256Hex(token);

	// Mark used in a single statement to prevent reuse.
	const result = await query(
		`
			UPDATE customer_email_verifications
			SET used_at = NOW()
			WHERE token_hash = $1
			  AND used_at IS NULL
			  AND expires_at > NOW()
			RETURNING id, email, payload, user_id;
		`,
		[tokenHash]
	);

	return result.rows[0] ?? null;
};
