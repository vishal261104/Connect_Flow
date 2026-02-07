import {
	createCustomer,
	deleteCustomer,
	getCustomerByEmail,
	getCustomerById,
	listCustomers,
	updateCustomer,
} from "../models/customerModel.js";

import { isValidEmailFormat, normalizeEmail } from "../utils/email.js";
import {
	consumeCustomerEmailVerification,
	createCustomerEmailVerification,
} from "../models/verificationModel.js";
import { isSmtpConfigured, sendVerificationEmail } from "../utils/mailer.js";

const getRequestBaseUrl = (req) => {
	const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
	const forwardedHost = String(req.headers["x-forwarded-host"] ?? "").split(",")[0].trim();

	const proto = forwardedProto || req.protocol || "http";
	const host = forwardedHost || req.get("host");
	if (!host) return null;
	return `${proto}://${host}`;
};

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
		const { name, phone, email, company } = req.body ?? {};
		if (!name || typeof name !== "string" || !name.trim()) {
			return res.status(400).json({ message: "Name is required" });
		}

		// For verification-based creation, email is required.
		const normalizedEmail = await validateEmailOrThrow(email);
		if (!normalizedEmail) {
			return res.status(400).json({ message: "Email is required for verification" });
		}

		const existing = await getCustomerByEmail(normalizedEmail);
		if (existing) {
			return res.status(409).json({ message: "Email already exists" });
		}

		const payload = {
			name: name.trim(),
			phone: phone ?? null,
			email: normalizedEmail,
			company: company ?? null,
		};

		const { token, verification } = await createCustomerEmailVerification({
			email: normalizedEmail,
			payload,
		});

		const configuredBase = (process.env.SERVER_BASE_URL ?? "").trim();
		const serverBase = configuredBase || getRequestBaseUrl(req) || `http://localhost:${process.env.PORT ?? 5000}`;
		const verifyUrl = `${serverBase}/api/customers/verify-email?token=${encodeURIComponent(token)}`;

		if (!isSmtpConfigured()) {
			return res.status(202).json({
				message: "SMTP not configured. Use verifyUrl to verify manually.",
				expires_at: verification.expires_at,
				verifyUrl,
			});
		}

		await sendVerificationEmail({ to: normalizedEmail, verifyUrl });
		return res.status(202).json({ message: "Verification email sent", expires_at: verification.expires_at });
	} catch (err) {
		return next(err);
	}
};

export const verifyCustomerEmailHandler = async (req, res, next) => {
	try {
		const token = String(req.query.token ?? "").trim();
		if (!token) return res.status(400).send("Missing token");

		const consumed = await consumeCustomerEmailVerification({ token });
		if (!consumed) return res.status(400).send("Invalid or expired token");

		const payload = consumed.payload ?? {};
		const normalizedEmail = await validateEmailOrThrow(payload.email);
		if (!normalizedEmail) return res.status(400).send("Invalid payload");

		const existing = await getCustomerByEmail(normalizedEmail);
		if (existing) return res.status(409).send("Email already exists");

		const customer = await createCustomer({
			name: String(payload.name ?? "").trim(),
			phone: payload.phone ?? null,
			email: normalizedEmail,
			company: payload.company ?? null,
		});

		const clientOrigin = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173").trim();
		if (clientOrigin) {
			return res.redirect(302, `${clientOrigin}/customers/${customer.id}`);
		}

		return res.json({ message: "Verified", customer });
	} catch (err) {
		return next(err);
	}
};

export const listCustomersHandler = async (req, res, next) => {
	try {
		const customers = await listCustomers();
		return res.json(customers);
	} catch (err) {
		return next(err);
	}
};

export const getCustomerHandler = async (req, res, next) => {
	try {
		const id = parseId(req.params.id);
		if (!id) return res.status(400).json({ message: "Invalid customer id" });

		const customer = await getCustomerById(id);
		if (!customer) return res.status(404).json({ message: "Customer not found" });
		return res.json(customer);
	} catch (err) {
		return next(err);
	}
};

export const updateCustomerHandler = async (req, res, next) => {
	try {
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
				const existing = await getCustomerByEmail(normalizedEmail);
				if (existing && Number(existing.id) !== id) {
					return res.status(409).json({ message: "Email already exists" });
				}
			}
		}

		const updated = await updateCustomer(id, {
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
		const id = parseId(req.params.id);
		if (!id) return res.status(400).json({ message: "Invalid customer id" });

		const deleted = await deleteCustomer(id);
		if (!deleted) return res.status(404).json({ message: "Customer not found" });
		return res.status(204).send();
	} catch (err) {
		return next(err);
	}
};
