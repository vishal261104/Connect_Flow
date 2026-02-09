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
    // Users (auth)
    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
    await query("CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (LOWER(email));");

    await query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL
        );
    `);
    await query("CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_hash_unique_idx ON user_sessions (token_hash);");
    await query("CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id);");

    await query(`
        CREATE TABLE IF NOT EXISTS customers (
            id BIGSERIAL PRIMARY KEY,
            owner_user_id BIGINT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            company TEXT,
            is_lead BOOLEAN NOT NULL DEFAULT FALSE,
            lead_stage TEXT,
            deal_value NUMERIC,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    // Backfill-compatible migrations for existing DBs.
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS owner_user_id BIGINT;");
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_lead BOOLEAN NOT NULL DEFAULT FALSE;");
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS lead_stage TEXT;");
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS deal_value NUMERIC;");
    await query(
        "ALTER TABLE customers ADD CONSTRAINT customers_owner_user_id_fk FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;"
    ).catch(() => {});

    // Email uniqueness is per user (still allowing NULL).
    await query("DROP INDEX IF EXISTS customers_email_unique_idx;");
    await query(
        "CREATE UNIQUE INDEX IF NOT EXISTS customers_owner_email_unique_idx ON customers (owner_user_id, LOWER(email)) WHERE email IS NOT NULL;"
    );

    await query(`
        CREATE TABLE IF NOT EXISTS customer_email_verifications (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            payload JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ
        );
    `);
    await query("ALTER TABLE customer_email_verifications ADD COLUMN IF NOT EXISTS user_id BIGINT;");

    await query(
        "CREATE UNIQUE INDEX IF NOT EXISTS customer_email_verifications_token_hash_unique_idx ON customer_email_verifications(token_hash);"
    );
    await query(
        "CREATE INDEX IF NOT EXISTS customer_email_verifications_email_idx ON customer_email_verifications(LOWER(email));"
    );
    await query(
        "CREATE INDEX IF NOT EXISTS customer_email_verifications_user_id_idx ON customer_email_verifications(user_id);"
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

    // Tasks (follow-ups)
    await query(`
        CREATE TABLE IF NOT EXISTS tasks (
            id BIGSERIAL PRIMARY KEY,
            owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            due_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            completed_at TIMESTAMPTZ
        );
    `);
    await query("CREATE INDEX IF NOT EXISTS tasks_owner_user_id_idx ON tasks(owner_user_id);");
    await query("CREATE INDEX IF NOT EXISTS tasks_customer_id_idx ON tasks(customer_id);");
    await query("CREATE INDEX IF NOT EXISTS tasks_due_at_idx ON tasks(due_at);");
};
 