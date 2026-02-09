import crypto from "node:crypto";

const KEY_LEN = 64;
const SCRYPT_OPTIONS = {
	N: 16384,
	r: 8,
	p: 1,
	maxmem: 64 * 1024 * 1024,
};

export const hashPassword = async (password) => {
	if (typeof password !== "string" || password.length < 6) {
		const err = new Error("Password must be at least 6 characters");
		err.status = 400;
		throw err;
	}

	const salt = crypto.randomBytes(16).toString("hex");
	const derived = await new Promise((resolve, reject) => {
		crypto.scrypt(password, salt, KEY_LEN, SCRYPT_OPTIONS, (err, key) => {
			if (err) return reject(err);
			return resolve(key);
		});
	});

	return `scrypt$${salt}$${derived.toString("hex")}`;
};

export const verifyPassword = async (password, storedHash) => {
	if (!storedHash || typeof storedHash !== "string") return false;
	const [scheme, salt, hex] = storedHash.split("$");
	if (scheme !== "scrypt" || !salt || !hex) return false;

	const derived = await new Promise((resolve, reject) => {
		crypto.scrypt(password, salt, KEY_LEN, SCRYPT_OPTIONS, (err, key) => {
			if (err) return reject(err);
			return resolve(key);
		});
	});

	const a = Buffer.from(hex, "hex");
	const b = Buffer.from(derived.toString("hex"), "hex");
	if (a.length !== b.length) return false;
	return crypto.timingSafeEqual(a, b);
};
