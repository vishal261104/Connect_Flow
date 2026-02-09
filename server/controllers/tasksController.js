import { getCustomerById } from "../models/customerModel.js";
import { createTask, listTasksByCustomer, updateTask } from "../models/tasksModel.js";

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
		const ownerUserId = Number(req.user?.id);
		const customerId = parseId(req.params.customerId);
		if (!customerId) return res.status(400).json({ message: "Invalid customer id" });

		const customer = await getCustomerById(ownerUserId, customerId);
		if (!customer) return res.status(404).json({ message: "Customer not found" });

		const tasks = await listTasksByCustomer({ ownerUserId, customerId });
		return res.json(tasks);
	} catch (err) {
		return next(err);
	}
};

export const createTaskHandler = async (req, res, next) => {
	try {
		const ownerUserId = Number(req.user?.id);
		const customerId = parseId(req.params.customerId);
		if (!customerId) return res.status(400).json({ message: "Invalid customer id" });

		const title = String(req.body?.title ?? "").trim();
		if (!title) return res.status(400).json({ message: "Task title is required" });

		const dueAtParsed = parseDueAt(req.body?.due_at);
		if (dueAtParsed === undefined) return res.status(400).json({ message: "Invalid due date" });

		const customer = await getCustomerById(ownerUserId, customerId);
		if (!customer) return res.status(404).json({ message: "Customer not found" });

		const task = await createTask({ ownerUserId, customerId, title, dueAt: dueAtParsed });
		return res.status(201).json(task);
	} catch (err) {
		return next(err);
	}
};

export const updateTaskHandler = async (req, res, next) => {
	try {
		const ownerUserId = Number(req.user?.id);
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

		const customer = await getCustomerById(ownerUserId, customerId);
		if (!customer) return res.status(404).json({ message: "Customer not found" });

		const updated = await updateTask({ ownerUserId, customerId, taskId, title, status, dueAt: dueAtParsed });
		if (!updated) return res.status(404).json({ message: "Task not found" });
		return res.json(updated);
	} catch (err) {
		return next(err);
	}
};
