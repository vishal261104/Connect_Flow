import { query } from "../config/db.js";

export const addNote = async ({ workspaceId, actorUserId, customerId, body }) => {
	const result = await query(
		`
			INSERT INTO notes (customer_id, workspace_id, actor_user_id, body)
			SELECT c.id, $1, $2, $4
			FROM customers c
			WHERE c.workspace_id = $1 AND c.id = $3
			RETURNING id, customer_id, workspace_id, actor_user_id, body, created_at;
		`,
		[workspaceId, actorUserId, customerId, body]
	);
	return result.rows[0];
};

export const listNotesByCustomer = async (workspaceId, customerId) => {
	const result = await query(
		`
			SELECT n.id, n.customer_id, n.body, n.created_at, n.actor_user_id
			FROM notes n
			JOIN customers c ON c.id = n.customer_id
			WHERE c.workspace_id = $1 AND n.customer_id = $2
			ORDER BY created_at DESC, id DESC;
		`,
		[workspaceId, customerId]
	);
	return result.rows;
};

export const deleteNote = async (noteId) => {
	const result = await query(
		`
			DELETE FROM notes
			WHERE id = $1
			RETURNING id;
		`,
		[noteId]
	);
	return (result.rowCount ?? 0) > 0;
};

export const deleteNoteForCustomer = async ({ workspaceId, noteId, customerId }) => {
	const result = await query(
		`
			DELETE FROM notes n
			USING customers c
			WHERE n.customer_id = c.id
			  AND c.workspace_id = $1
			  AND n.id = $2
			  AND n.customer_id = $3
			RETURNING id;
		`,
		[workspaceId, noteId, customerId]
	);
	return (result.rowCount ?? 0) > 0;
};

export const updateNote = async ({ workspaceId, actorUserId, noteId, customerId, body }) => {
	const result = await query(
		`
			UPDATE notes n
			SET body = $1,
				actor_user_id = COALESCE($5, actor_user_id)
			FROM customers c
			WHERE n.customer_id = c.id
			  AND c.workspace_id = $2
			  AND n.id = $3
			  AND n.customer_id = $4
			RETURNING n.id, n.customer_id, n.body, n.created_at, n.actor_user_id;
		`,
		[body, workspaceId, noteId, customerId, actorUserId]
	);
	return result.rows[0] ?? null;
};
