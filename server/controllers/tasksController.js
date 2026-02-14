import { getCustomerById } from "../models/customerModel.js";
import { createTask, listTasksByCustomer, updateTask } from "../models/tasksModel.js";
import { createActivity } from "../models/activitiesModel.js";
import { createNotification } from "../models/notificationsModel.js";
import { emitToUser } from "../realtime/emitter.js";

const parseId = (value) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) return null;
	return parsed;
};

const parseDueAt = (value) => {
	if (value == null || value === "") return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return undefined;
	return d.toISOString();
};

export const listTasksHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const customerId = parseId(req.params.customerId);
		if (!customerId) return res.status(400).json({ message: "Invalid customer id" });

		const customer = await getCustomerById(workspaceId, customerId);
		if (!customer) return res.status(404).json({ message: "Customer not found" });

		const tasks = await listTasksByCustomer({ workspaceId, customerId });
		return res.json(tasks);
	} catch (err) {
		return next(err);
	}
};

export const createTaskHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const actorUserId = Number(req.user?.id);
		const customerId = parseId(req.params.customerId);
		if (!customerId) return res.status(400).json({ message: "Invalid customer id" });

		const title = String(req.body?.title ?? "").trim();
		if (!title) return res.status(400).json({ message: "Task title is required" });

		const dueAtParsed = parseDueAt(req.body?.due_at);
		if (dueAtParsed === undefined) return res.status(400).json({ message: "Invalid due date" });

		const customer = await getCustomerById(workspaceId, customerId);
		if (!customer) return res.status(404).json({ message: "Customer not found" });

		const assignedUserId = req.body?.assigned_user_id != null ? Number(req.body.assigned_user_id) : undefined;
		const task = await createTask({
			workspaceId,
			actorUserId,
			assignedUserId,
			customerId,
			title,
			dueAt: dueAtParsed,
		});

		await createActivity({
			workspaceId,
			customerId,
			actorUserId,
			type: "TASK_CREATED",
			data: { taskId: Number(task.id), title: task.title, due_at: task.due_at ?? null },
		});

		const effectiveAssignee = task.assigned_user_id != null ? Number(task.assigned_user_id) : null;
		if (effectiveAssignee && effectiveAssignee !== actorUserId) {
			const notif = await createNotification({
				workspaceId,
				userId: effectiveAssignee,
				actorUserId,
				type: "TASK_ASSIGNED",
				data: { customerId, taskId: Number(task.id), title: task.title, due_at: task.due_at ?? null },
			});
			emitToUser(effectiveAssignee, "notification:new", notif);
		}
		return res.status(201).json(task);
	} catch (err) {
		return next(err);
	}
};

export const updateTaskHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const actorUserId = Number(req.user?.id);
		const customerId = parseId(req.params.customerId);
		if (!customerId) return res.status(400).json({ message: "Invalid customer id" });

		const taskId = parseId(req.params.taskId);
		if (!taskId) return res.status(400).json({ message: "Invalid task id" });

		const title = req.body?.title != null ? String(req.body.title).trim() : null;
		if (title != null && !title) return res.status(400).json({ message: "Task title cannot be empty" });

		let status = req.body?.status != null ? String(req.body.status).trim() : null;
		if (status != null && status !== "Pending" && status !== "Completed") {
			return res.status(400).json({ message: "Invalid status" });
		}

		const dueAtParsed = req.body?.due_at !== undefined ? parseDueAt(req.body?.due_at) : null;
		if (dueAtParsed === undefined) return res.status(400).json({ message: "Invalid due date" });

		const customer = await getCustomerById(workspaceId, customerId);
		if (!customer) return res.status(404).json({ message: "Customer not found" });

		const assignedUserId =
			req.body?.assigned_user_id !== undefined
				? req.body.assigned_user_id == null
					? null
					: Number(req.body.assigned_user_id)
				: undefined;

		const updated = await updateTask({
			workspaceId,
			customerId,
			taskId,
			title,
			status,
			dueAt: dueAtParsed,
			assignedUserId,
		});
		if (!updated) return res.status(404).json({ message: "Task not found" });

		await createActivity({
			workspaceId,
			customerId,
			actorUserId,
			type: "TASK_UPDATED",
			data: {
				taskId: Number(updated.id),
				status: updated.status,
				due_at: updated.due_at ?? null,
				assigned_user_id: updated.assigned_user_id ?? null,
			},
		});

		if (status === "Completed") {
			const effectiveAssignee = updated.assigned_user_id != null ? Number(updated.assigned_user_id) : null;
			if (effectiveAssignee && effectiveAssignee !== actorUserId) {
				const notif = await createNotification({
					workspaceId,
					userId: effectiveAssignee,
					actorUserId,
					type: "TASK_COMPLETED",
					data: { customerId, taskId: Number(updated.id), title: updated.title },
				});
				emitToUser(effectiveAssignee, "notification:new", notif);
			}
		}

		if (assignedUserId !== undefined) {
			const effectiveAssignee = updated.assigned_user_id != null ? Number(updated.assigned_user_id) : null;
			if (effectiveAssignee && effectiveAssignee !== actorUserId) {
				const notif = await createNotification({
					workspaceId,
					userId: effectiveAssignee,
					actorUserId,
					type: "TASK_ASSIGNED",
					data: { customerId, taskId: Number(updated.id), title: updated.title, due_at: updated.due_at ?? null },
				});
				emitToUser(effectiveAssignee, "notification:new", notif);
			}
		}
		return res.json(updated);
	} catch (err) {
		return next(err);
	}
};
