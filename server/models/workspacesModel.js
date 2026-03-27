import { query } from "../config/db.js";

export const createWorkspace = async ({ name }) => {
	const result = await query(
		`
			INSERT INTO workspaces (name)
			VALUES ($1)
			RETURNING id, name, created_at;
		`,
		[name]
	);
	return result.rows[0];
};

export const listWorkspaces = async () => {
	const result = await query(
		`
			SELECT id, name, created_at
			FROM workspaces
			ORDER BY created_at ASC, id ASC;
		`
	);
	return result.rows;
};

export const getWorkspaceById = async ({ id }) => {
	const result = await query(
		`
			SELECT id, name, created_at
			FROM workspaces
			WHERE id = $1;
		`,
		[id]
	);
	return result.rows[0] ?? null;
};
