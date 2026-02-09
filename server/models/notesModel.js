import { query } from "../config/db.js";

export const addNote = async ({ ownerUserId, customerId, body }) => {
	const result = await query(
		`
			INSERT INTO notes (customer_id, body)
			SELECT c.id, $3
			FROM customers c
			WHERE c.owner_user_id = $1 AND c.id = $2
			RETURNING id, customer_id, body, created_at;
		`,
		[ownerUserId, customerId, body]
	);
	return result.rows[0];
};

export const listNotesByCustomer = async (ownerUserId, customerId) => {
	const result = await query(
		`
			SELECT n.id, n.customer_id, n.body, n.created_at
			FROM notes n
			JOIN customers c ON c.id = n.customer_id
			WHERE c.owner_user_id = $1 AND n.customer_id = $2
			ORDER BY created_at DESC, id DESC;
		`,
		[ownerUserId, customerId]
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

export const deleteNoteForCustomer = async ({ ownerUserId, noteId, customerId }) => {
	const result = await query(
		`
			DELETE FROM notes n
			USING customers c
			WHERE n.customer_id = c.id
			  AND c.owner_user_id = $1
			  AND n.id = $2
			  AND n.customer_id = $3
			RETURNING id;
		`,
		[ownerUserId, noteId, customerId]
	);
	return (result.rowCount ?? 0) > 0;
};

export const updateNote = async ({ ownerUserId, noteId, customerId, body }) => {
	const result = await query(
		`
			UPDATE notes n
			SET body = $1
			FROM customers c
			WHERE n.customer_id = c.id
			  AND c.owner_user_id = $2
			  AND n.id = $3
			  AND n.customer_id = $4
			RETURNING n.id, n.customer_id, n.body, n.created_at;
		`,
		[body, ownerUserId, noteId, customerId]
	);
	return result.rows[0] ?? null;
};
