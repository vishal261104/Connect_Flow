import { resolveMx } from "node:dns/promises";

export const normalizeEmail = (value) => {
	if (value == null) return null;
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	return trimmed;
};

export const isValidEmailFormat = (email) => {
	if (typeof email !== "string") return false;
	if (email.length > 254) return false;

	// Intentionally simple: catches common invalid input without being overly strict.
	const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return re.test(email);
};

export const getEmailDomain = (email) => {
	if (typeof email !== "string") return null;
	const at = email.lastIndexOf("@");
	if (at <= 0 || at === email.length - 1) return null;
	return email.slice(at + 1).toLowerCase();
};

export const hasMxRecords = async (domain) => {
	if (!domain) return false;
	try {
		const records = await resolveMx(domain);
		return Array.isArray(records) && records.length > 0;
	} catch (err) {
		// ENOTFOUND / ENODATA => domain doesn't accept mail.
		// EAI_AGAIN could be a transient DNS issue; treat as "not verifiable".
		return false;
	}
};
