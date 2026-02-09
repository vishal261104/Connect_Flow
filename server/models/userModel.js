import { query } from "../config/db.js";

export const createUser = async ({ email, passwordHash }) => {
	const result = await query(
		`
			INSERT INTO users (email, password_hash)
			VALUES ($1, $2)
			RETURNING id, email, created_at;
		`,
		[email, passwordHash]
	);
	return result.rows[0];
};

export const getUserByEmail = async (email) => {
	const result = await query(
		`
			SELECT id, email, password_hash, created_at
			FROM users
			WHERE LOWER(email) = LOWER($1)
			LIMIT 1;
		`,
		[email]
	);
	return result.rows[0] ?? null;
};

export const getUserById = async (id) => {
	const result = await query(
		`
			SELECT id, email, created_at
			FROM users
			WHERE id = $1;
		`,
		[id]
	);
	return result.rows[0] ?? null;
};
