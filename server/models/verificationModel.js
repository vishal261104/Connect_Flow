import crypto from "node:crypto";
import { query } from "../config/db.js";

const sha256Hex = (value) => crypto.createHash("sha256").update(value).digest("hex");

export const createCustomerEmailVerification = async ({ email, payload, ttlMinutes = 30 }) => {
	const token = crypto.randomBytes(32).toString("hex");
	const tokenHash = sha256Hex(token);

	// Keep one active pending verification per email (best-effort cleanup).
	await query(
		`
			DELETE FROM customer_email_verifications
			WHERE LOWER(email) = LOWER($1)
			  AND used_at IS NULL;
		`,
		[email]
	);

	const result = await query(
		`
			INSERT INTO customer_email_verifications (email, token_hash, payload, expires_at)
			VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval)
			RETURNING id, email, expires_at;
		`,
		[email, tokenHash, payload, String(ttlMinutes)]
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
			RETURNING id, email, payload;
		`,
		[tokenHash]
	);

	return result.rows[0] ?? null;
};
