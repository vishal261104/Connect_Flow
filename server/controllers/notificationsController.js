import {
	countUnreadNotifications,
	listNotificationsByUser,
	markAllNotificationsRead,
	markNotificationRead,
} from "../models/notificationsModel.js";

const parseId = (value) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) return null;
	return parsed;
};

export const listNotificationsHandler = async (req, res, next) => {
	try {
		const userId = Number(req.user?.id);
		const unreadOnly = String(req.query?.unread_only ?? "").toLowerCase() === "true";
		const limit = req.query?.limit;
		const notifications = await listNotificationsByUser({ userId, unreadOnly, limit });
		return res.json(notifications);
	} catch (err) {
		return next(err);
	}
};

export const unreadCountHandler = async (req, res, next) => {
	try {
		const userId = Number(req.user?.id);
		const count = await countUnreadNotifications({ userId });
		return res.json({ unread: count });
	} catch (err) {
		return next(err);
	}
};

export const markReadHandler = async (req, res, next) => {
	try {
		const userId = Number(req.user?.id);
		const notificationId = parseId(req.params.id);
		if (!notificationId) return res.status(400).json({ message: "Invalid notification id" });
		const updated = await markNotificationRead({ userId, notificationId });
		if (!updated) return res.status(404).json({ message: "Notification not found" });
		return res.json(updated);
	} catch (err) {
		return next(err);
	}
};

export const markAllReadHandler = async (req, res, next) => {
	try {
		const userId = Number(req.user?.id);
		const count = await markAllNotificationsRead({ userId });
		return res.json({ updated: count });
	} catch (err) {
		return next(err);
	}
};
