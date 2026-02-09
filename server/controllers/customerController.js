import {
	createCustomer,
	deleteCustomer,
	getCustomerByEmail,
	getCustomerById,
	listCustomers,
	updateCustomer,
} from "../models/customerModel.js";

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
		const ownerUserId = Number(req.user?.id);
		if (!ownerUserId) return res.status(401).json({ message: "Unauthorized" });

		const { name, phone, email, company } = req.body ?? {};
		if (!name || typeof name !== "string" || !name.trim()) {
			return res.status(400).json({ message: "Name is required" });
		}

		// Email verification disabled: create immediately. Email is optional.
		const normalizedEmail = await validateEmailOrThrow(email);
		if (normalizedEmail) {
			const existing = await getCustomerByEmail(ownerUserId, normalizedEmail);
			if (existing) {
				return res.status(409).json({ message: "Email already exists" });
			}
		}

		const customer = await createCustomer({
			ownerUserId,
			name: name.trim(),
			phone: phone ?? null,
			email: normalizedEmail ?? null,
			company: company ?? null,
		});

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
		const ownerUserId = Number(req.user?.id);
		const customers = await listCustomers(ownerUserId);
		return res.json(customers);
	} catch (err) {
		return next(err);
	}
};

export const getCustomerHandler = async (req, res, next) => {
	try {
		const ownerUserId = Number(req.user?.id);
		const id = parseId(req.params.id);
		if (!id) return res.status(400).json({ message: "Invalid customer id" });

		const customer = await getCustomerById(ownerUserId, id);
		if (!customer) return res.status(404).json({ message: "Customer not found" });
		return res.json(customer);
	} catch (err) {
		return next(err);
	}
};

export const updateCustomerHandler = async (req, res, next) => {
	try {
		const ownerUserId = Number(req.user?.id);
		const id = parseId(req.params.id);
		if (!id) return res.status(400).json({ message: "Invalid customer id" });

		const { name, phone, email, company } = req.body ?? {};
		if (name != null && (typeof name !== "string" || !name.trim())) {
			return res.status(400).json({ message: "Name cannot be empty" });
		}

		let normalizedEmail;
		if (email != null) {
			normalizedEmail = await validateEmailOrThrow(email);
			if (normalizedEmail) {
				const existing = await getCustomerByEmail(ownerUserId, normalizedEmail);
				if (existing && Number(existing.id) !== id) {
					return res.status(409).json({ message: "Email already exists" });
				}
			}
		}

		const updated = await updateCustomer(ownerUserId, id, {
			name: name != null ? name.trim() : undefined,
			phone,
			email: email != null ? normalizedEmail : undefined,
			company,
		});

		if (!updated) return res.status(404).json({ message: "Customer not found" });
		return res.json(updated);
	} catch (err) {
		return next(err);
	}
};

export const deleteCustomerHandler = async (req, res, next) => {
	try {
		const ownerUserId = Number(req.user?.id);
		const id = parseId(req.params.id);
		if (!id) return res.status(400).json({ message: "Invalid customer id" });

		const deleted = await deleteCustomer(ownerUserId, id);
		if (!deleted) return res.status(404).json({ message: "Customer not found" });
		return res.status(204).send();
	} catch (err) {
		return next(err);
	}
};
