import { query } from "../config/db.js";

export const addNote = async ({ customerId, body }) => {
	const result = await query(
		`
			INSERT INTO notes (customer_id, body)
			VALUES ($1, $2)
			RETURNING id, customer_id, body, created_at;
		`,
		[customerId, body]
	);
	return result.rows[0];
};

export const listNotesByCustomer = async (customerId) => {
	const result = await query(
		`
			SELECT id, customer_id, body, created_at
			FROM notes
			WHERE customer_id = $1
			ORDER BY created_at DESC, id DESC;
		`,
		[customerId]
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

export const deleteNoteForCustomer = async ({ noteId, customerId }) => {
	const result = await query(
		`
			DELETE FROM notes
			WHERE id = $1 AND customer_id = $2
			RETURNING id;
		`,
		[noteId, customerId]
	);
	return (result.rowCount ?? 0) > 0;
};

export const updateNote = async ({ noteId, customerId, body }) => {
	const result = await query(
		`
			UPDATE notes
			SET body = $1
			WHERE id = $2 AND customer_id = $3
			RETURNING id, customer_id, body, created_at;
		`,
		[body, noteId, customerId]
	);
	return result.rows[0] ?? null;
};
