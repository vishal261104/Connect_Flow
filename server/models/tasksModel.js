import { query } from "../config/db.js";

const TASK_SELECT =
	"id, workspace_id, owner_user_id, assigned_user_id, customer_id, title, status, due_at, created_at, completed_at";

export const listTasksByCustomer = async ({ workspaceId, customerId }) => {
	const result = await query(
		`
			SELECT ${TASK_SELECT}
			FROM tasks
			WHERE workspace_id = $1 AND customer_id = $2
			ORDER BY status ASC, due_at ASC NULLS LAST, created_at DESC, id DESC;
		`,
		[workspaceId, customerId]
	);
	return result.rows;
};

export const createTask = async ({ workspaceId, actorUserId, assignedUserId, customerId, title, dueAt }) => {
	const result = await query(
		`
			INSERT INTO tasks (workspace_id, owner_user_id, assigned_user_id, customer_id, title, due_at)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING ${TASK_SELECT};
		`,
		[workspaceId, actorUserId, assignedUserId ?? actorUserId, customerId, title, dueAt ?? null]
	);
	return result.rows[0];
};

export const updateTask = async ({ workspaceId, customerId, taskId, title, status, dueAt, assignedUserId }) => {
	const sets = [];
	const values = [];
	let index = 1;

	const pushSet = (column, value) => {
		sets.push(`${column} = $${index}`);
		values.push(value);
		index += 1;
	};

	if (title != null) pushSet("title", title);
	if (status != null) pushSet("status", status);
	if (dueAt != null) pushSet("due_at", dueAt);
	if (assignedUserId !== undefined) pushSet("assigned_user_id", assignedUserId);

	if (sets.length === 0) return null;

	if (status === "Completed") {
		sets.push("completed_at = NOW()");
	} else if (status === "Pending") {
		sets.push("completed_at = NULL");
	}

	values.push(workspaceId);
	values.push(customerId);
	values.push(taskId);

	const result = await query(
		`
			UPDATE tasks
			SET ${sets.join(", ")}
			WHERE workspace_id = $${index}
			  AND customer_id = $${index + 1}
			  AND id = $${index + 2}
			RETURNING ${TASK_SELECT};
		`,
		values
	);
	return result.rows[0] ?? null;
};

export const countTasksPendingToday = async ({ workspaceId }) => {
	const result = await query(
		`
			SELECT COUNT(*)::bigint AS count
			FROM tasks
			WHERE workspace_id = $1
			  AND status = 'Pending'
			  AND due_at IS NOT NULL
			  AND (due_at AT TIME ZONE 'UTC')::date = (NOW() AT TIME ZONE 'UTC')::date;
		`,
		[workspaceId]
	);
	return Number(result.rows?.[0]?.count ?? 0);
};
