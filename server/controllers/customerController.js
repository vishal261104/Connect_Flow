import {
	createCustomer,
	deleteCustomer,
	getCustomerByEmail,
	getCustomerById,
	listCustomers,
	updateCustomer,
} from "../models/customerModel.js";

import { createActivity } from "../models/activitiesModel.js";
import { createNotification } from "../models/notificationsModel.js";
import { emitToUser } from "../realtime/emitter.js";

import { isValidEmailFormat, normalizeEmail } from "../utils/email.js";

const parseId = (value) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) return null;
	return parsed;
};

const validateEmailOrThrow = async (rawEmail) => {
	const email = normalizeEmail(rawEmail);
	if (!email) return null;
	if (!isValidEmailFormat(email)) {
		const err = new Error("Invalid email format");
		err.status = 400;
		throw err;
	}
	return email;
};

export const createCustomerHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const ownerUserId = Number(req.user?.id);
		if (!workspaceId || !ownerUserId) return res.status(401).json({ message: "Unauthorized" });

		const { name, phone, email, company, assigned_user_id } = req.body ?? {};
		if (!name || typeof name !== "string" || !name.trim()) {
			return res.status(400).json({ message: "Name is required" });
		}

		// Email verification disabled: create immediately. Email is optional.
		const normalizedEmail = await validateEmailOrThrow(email);
		if (normalizedEmail) {
			const existing = await getCustomerByEmail(workspaceId, normalizedEmail);
			if (existing) {
				return res.status(409).json({ message: "Email already exists" });
			}
		}

		const customer = await createCustomer({
			workspaceId,
			ownerUserId,
			assignedUserId: assigned_user_id != null ? Number(assigned_user_id) : null,
			name: name.trim(),
			phone: phone ?? null,
			email: normalizedEmail ?? null,
			company: company ?? null,
		});

		await createActivity({
			workspaceId,
			customerId: Number(customer.id),
			actorUserId: ownerUserId,
			type: "CUSTOMER_CREATED",
			data: { name: customer.name, company: customer.company ?? null },
		});

		const assignedUserId = customer.assigned_user_id != null ? Number(customer.assigned_user_id) : null;
		if (assignedUserId && assignedUserId !== ownerUserId) {
			const notif = await createNotification({
				workspaceId,
				userId: assignedUserId,
				actorUserId: ownerUserId,
				type: "CUSTOMER_ASSIGNED",
				data: { customerId: Number(customer.id), customerName: customer.name },
			});
			emitToUser(assignedUserId, "notification:new", notif);
		}

		return res.status(201).json(customer);
	} catch (err) {
		return next(err);
	}
};

export const verifyCustomerEmailHandler = async (req, res, next) => {
	try {
		// Email verification disabled.
		return res.status(410).send("Email verification is disabled.");
	} catch (err) {
		return next(err);
	}
};

export const listCustomersHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const q = String(req.query?.q ?? "").trim() || undefined;
		const isLead = req.query?.is_lead != null ? String(req.query.is_lead).toLowerCase() === "true" : undefined;
		const leadStage = String(req.query?.lead_stage ?? "").trim() || undefined;
		const minDealValue = req.query?.min_deal_value != null ? Number(req.query.min_deal_value) : undefined;
		const maxDealValue = req.query?.max_deal_value != null ? Number(req.query.max_deal_value) : undefined;
		const createdFrom = String(req.query?.created_from ?? "").trim() || undefined;
		const createdTo = String(req.query?.created_to ?? "").trim() || undefined;

		const customers = await listCustomers(workspaceId, {
			q,
			isLead,
			leadStage,
			minDealValue: Number.isFinite(minDealValue) ? minDealValue : undefined,
			maxDealValue: Number.isFinite(maxDealValue) ? maxDealValue : undefined,
			createdFrom,
			createdTo,
		});
		return res.json(customers);
	} catch (err) {
		return next(err);
	}
};

export const getCustomerHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const id = parseId(req.params.id);
		if (!id) return res.status(400).json({ message: "Invalid customer id" });

		const customer = await getCustomerById(workspaceId, id);
		if (!customer) return res.status(404).json({ message: "Customer not found" });
		return res.json(customer);
	} catch (err) {
		return next(err);
	}
};

export const updateCustomerHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const actorUserId = Number(req.user?.id);
		const id = parseId(req.params.id);
		if (!id) return res.status(400).json({ message: "Invalid customer id" });

		const before = await getCustomerById(workspaceId, id);
		if (!before) return res.status(404).json({ message: "Customer not found" });

		const { name, phone, email, company, assigned_user_id } = req.body ?? {};
		if (name != null && (typeof name !== "string" || !name.trim())) {
			return res.status(400).json({ message: "Name cannot be empty" });
		}

		let normalizedEmail;
		if (email != null) {
			normalizedEmail = await validateEmailOrThrow(email);
			if (normalizedEmail) {
				const existing = await getCustomerByEmail(workspaceId, normalizedEmail);
				if (existing && Number(existing.id) !== id) {
					return res.status(409).json({ message: "Email already exists" });
				}
			}
		}

		const updated = await updateCustomer(workspaceId, id, {
			name: name != null ? name.trim() : undefined,
			phone,
			email: email != null ? normalizedEmail : undefined,
			company,
			assignedUserId: assigned_user_id !== undefined ? (assigned_user_id == null ? null : Number(assigned_user_id)) : undefined,
		});

		if (!updated) return res.status(404).json({ message: "Customer not found" });

		await createActivity({
			workspaceId,
			customerId: Number(updated.id),
			actorUserId,
			type: "CUSTOMER_UPDATED",
			data: {
				changes: {
					name: name != null ? updated.name : undefined,
					phone: phone !== undefined ? updated.phone : undefined,
					email: email != null ? updated.email : undefined,
					company: company !== undefined ? updated.company : undefined,
					assigned_user_id: assigned_user_id !== undefined ? updated.assigned_user_id : undefined,
				},
			},
		});

		const beforeAssigned = before.assigned_user_id != null ? Number(before.assigned_user_id) : null;
		const afterAssigned = updated.assigned_user_id != null ? Number(updated.assigned_user_id) : null;
		if (beforeAssigned !== afterAssigned && afterAssigned && afterAssigned !== actorUserId) {
			const notif = await createNotification({
				workspaceId,
				userId: afterAssigned,
				actorUserId,
				type: "CUSTOMER_ASSIGNED",
				data: { customerId: Number(updated.id), customerName: updated.name },
			});
			emitToUser(afterAssigned, "notification:new", notif);
		}
		return res.json(updated);
	} catch (err) {
		return next(err);
	}
};

export const deleteCustomerHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const id = parseId(req.params.id);
		if (!id) return res.status(400).json({ message: "Invalid customer id" });

		const deleted = await deleteCustomer(workspaceId, id);
		if (!deleted) return res.status(404).json({ message: "Customer not found" });
		return res.status(204).send();
	} catch (err) {
		return next(err);
	}
};
