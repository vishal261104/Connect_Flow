import { query } from "../config/db.js";

const NOTIFICATION_SELECT =
	"id, workspace_id, user_id, actor_user_id, type, data, is_read, created_at";

export const createNotification = async ({
	workspaceId,
	userId,
	actorUserId = null,
	type,
	data = {},
}) => {
	const result = await query(
		`
			INSERT INTO notifications (workspace_id, user_id, actor_user_id, type, data)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING ${NOTIFICATION_SELECT};
		`,
		[workspaceId, userId, actorUserId, type, data ?? {}]
	);
	return result.rows[0];
};

export const listNotificationsByUser = async ({ userId, unreadOnly = false, limit = 50 }) => {
	const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
	const result = await query(
		`
			SELECT ${NOTIFICATION_SELECT}
			FROM notifications
			WHERE user_id = $1
			  AND ($2::boolean = FALSE OR is_read = FALSE)
			ORDER BY created_at DESC, id DESC
			LIMIT $3;
		`,
		[userId, Boolean(unreadOnly), safeLimit]
	);
	return result.rows;
};

export const countUnreadNotifications = async ({ userId }) => {
	const result = await query(
		`
			SELECT COUNT(*)::bigint AS count
			FROM notifications
			WHERE user_id = $1 AND is_read = FALSE;
		`,
		[userId]
	);
	return Number(result.rows?.[0]?.count ?? 0);
};

export const markNotificationRead = async ({ userId, notificationId }) => {
	const result = await query(
		`
			UPDATE notifications
			SET is_read = TRUE
			WHERE id = $1 AND user_id = $2
			RETURNING ${NOTIFICATION_SELECT};
		`,
		[notificationId, userId]
	);
	return result.rows[0] ?? null;
};

export const markAllNotificationsRead = async ({ userId }) => {
	const result = await query(
		`
			UPDATE notifications
			SET is_read = TRUE
			WHERE user_id = $1 AND is_read = FALSE
			RETURNING id;
		`,
		[userId]
	);
	return Number(result.rowCount ?? 0);
};
