import pg from "pg";
import { logger } from "../utils/logger.js";

const { Pool } = pg;
let pool;
const redact = (connectionString) => {
    if (!connectionString) return "";
    try {
        const url = new URL(connectionString);
        if (url.password) url.password = "***";
        return url.toString();
    } catch {
        return "[connection string cannot be parsed]";
    }
};

export const connectDB = async () => {
    if (pool) return pool;

    const connectionString = (process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) {
        logger.error("Database connection failed", { needed: "DATABASE_URL" });
        throw new Error("Missing DATABASE_URL");
    }

    pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });

    const client = await pool.connect();
    try {
        await client.query("SELECT 1");
        logger.info("Database connected", { url: redact(connectionString) });
    } finally {
        client.release();
    }

    return pool;
};

export const getPool = () => {
    if (!pool) throw new Error("Database not initialized. Call connectDB() first.");
    return pool;
};

export const query = (text, params) => getPool().query(text, params);

export const closeDB = async () => {
    if (!pool) return;
    const poolToClose = pool;
    pool = undefined;
    await poolToClose.end();
};

export const ensureSchema = async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS customers (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            company TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

	// Prevent duplicate emails while still allowing NULL.
	await query(
		"CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique_idx ON customers (LOWER(email)) WHERE email IS NOT NULL;"
	);

    await query(`
        CREATE TABLE IF NOT EXISTS customer_email_verifications (
            id BIGSERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            payload JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ
        );
    `);

    await query(
        "CREATE UNIQUE INDEX IF NOT EXISTS customer_email_verifications_token_hash_unique_idx ON customer_email_verifications(token_hash);"
    );
    await query(
        "CREATE INDEX IF NOT EXISTS customer_email_verifications_email_idx ON customer_email_verifications(LOWER(email));"
    );

    await query(`
        CREATE TABLE IF NOT EXISTS notes (
            id BIGSERIAL PRIMARY KEY,
            customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            body TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await query("CREATE INDEX IF NOT EXISTS notes_customer_id_idx ON notes(customer_id);");
};
 