import { query } from "../config/db.js";

const ACTIVITY_SELECT = "id, workspace_id, customer_id, actor_user_id, type, data, created_at";

export const createActivity = async ({ workspaceId, customerId = null, actorUserId = null, type, data = {} }) => {
	const result = await query(
		`
			INSERT INTO activities (workspace_id, customer_id, actor_user_id, type, data)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING ${ACTIVITY_SELECT};
		`,
		[workspaceId, customerId, actorUserId, type, data ?? {}]
	);
	return result.rows[0];
};

export const listActivitiesByCustomer = async ({ workspaceId, customerId, limit = 100 }) => {
	const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 300));
	const result = await query(
		`
			SELECT ${ACTIVITY_SELECT}
			FROM activities
			WHERE workspace_id = $1 AND customer_id = $2
			ORDER BY created_at DESC, id DESC
			LIMIT $3;
		`,
		[workspaceId, customerId, safeLimit]
	);
	return result.rows;
};
