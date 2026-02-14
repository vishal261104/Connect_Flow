import { query } from "../config/db.js";

export const createUser = async ({ email, passwordHash, name = null }) => {
	const result = await query(
		`
			INSERT INTO users (workspace_id, name, email, password_hash)
			VALUES ((SELECT id FROM workspaces ORDER BY id ASC LIMIT 1), $1, $2, $3)
			RETURNING id, name, email, created_at;
		`,
		[name, email, passwordHash]
	);
	return result.rows[0];
};

export const getUserByEmail = async (email) => {
	const result = await query(
		`
			SELECT id, workspace_id, role, name, email, password_hash, created_at
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
			SELECT id, workspace_id, role, name, email, created_at
			FROM users
			WHERE id = $1;
		`,
		[id]
	);
	return result.rows[0] ?? null;
};

export const getUserAuthById = async (id) => {
	const result = await query(
		`
			SELECT id, workspace_id, role, name, email, password_hash, created_at
			FROM users
			WHERE id = $1;
		`,
		[id]
	);
	return result.rows[0] ?? null;
};

export const updateUserPassword = async ({ userId, passwordHash }) => {
	const result = await query(
		`
			UPDATE users
			SET password_hash = $2
			WHERE id = $1
			RETURNING id;
		`,
		[userId, passwordHash]
	);
	return result.rows[0] ?? null;
};

export const updateUserName = async ({ userId, name }) => {
	const result = await query(
		`
			UPDATE users
			SET name = $2
			WHERE id = $1
			RETURNING id, workspace_id, role, name, email, created_at;
		`,
		[userId, name]
	);
	return result.rows[0] ?? null;
};

export const listUsersByWorkspace = async ({ workspaceId }) => {
	const result = await query(
		`
			SELECT id, name, email, role, created_at
			FROM users
			WHERE workspace_id = $1
			ORDER BY created_at ASC, id ASC;
		`,
		[workspaceId]
	);
	return result.rows;
};
