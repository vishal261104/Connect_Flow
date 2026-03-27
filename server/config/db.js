// db.js
// This file is responsible for:
// 1. Managing the PostgreSQL connection pool
// 2. Providing a central query() abstraction
// 3. Gracefully closing the connection pool
// 4. Automatically creating and migrating database schema at startup

import pg from "pg";
import { logger } from "../utils/logger.js";

const { Pool } = pg;

// We keep a module-level pool reference.
// This ensures a single shared pool across the entire app (singleton pattern).
let pool;

/**
 * redact()
 * Utility to safely log a connection string without exposing the password.
 * This prevents accidental credential leakage in logs.
 */
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

/**
 * connectDB()
 * Initializes the PostgreSQL connection pool.
 * Uses lazy initialization to ensure only one pool is created.
 */
export const connectDB = async () => {
    // If pool already exists, reuse it.
    if (pool) return pool;

    const connectionString = (process.env.DATABASE_URL ?? "").trim();

    // Fail fast if DATABASE_URL is missing.
    if (!connectionString) {
        logger.error("Database connection failed", { needed: "DATABASE_URL" });
        throw new Error("Missing DATABASE_URL");
    }

    // Create a new connection pool.
    // In production, SSL is enabled (common for hosted DBs).
    pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false,
    });

    // Test connectivity immediately to ensure DB is reachable.
    const client = await pool.connect();
    try {
        await client.query("SELECT 1");
        logger.info("Database connected", { url: redact(connectionString) });
    } finally {
        client.release();
    }

    return pool;
};

/**
 * getPool()
 * Ensures the pool is initialized before use.
 */
export const getPool = () => {
    if (!pool) {
        throw new Error("Database not initialized. Call connectDB() first.");
    }
    return pool;
};

/**
 * query()
 * Central wrapper for executing SQL queries.
 * This abstraction allows:
 * - Future logging
 * - Performance monitoring
 * - Query instrumentation
 */
export const query = (text, params) => getPool().query(text, params);

/**
 * closeDB()
 * Gracefully shuts down the pool.
 * Useful for tests or controlled shutdown.
 */
export const closeDB = async () => {
    if (!pool) return;
    const poolToClose = pool;
    pool = undefined;
    await poolToClose.end();
};

/**
 * ensureSchema()
 * This function acts as a lightweight auto-migration system.
 * It:
 * - Creates tables if they don't exist
 * - Adds missing columns (backward compatibility)
 * - Creates indexes for performance
 * - Backfills missing data where necessary
 */
export const ensureSchema = async () => {

    // ============================
    // WORKSPACES TABLE
    // ============================
    // Enables multi-tenant architecture.
    // Every customer, task, note, etc., belongs to a workspace.
    await query(`
        CREATE TABLE IF NOT EXISTS workspaces (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    // Ensure at least one workspace exists (for initial deployments).
    await query(`
        INSERT INTO workspaces (name)
        SELECT 'Default'
        WHERE NOT EXISTS (SELECT 1 FROM workspaces);
    `);

    // ============================
    // USERS TABLE
    // ============================
    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            workspace_id BIGINT,
            name TEXT,
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Sales',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    // Enforce case-insensitive unique email.
    await query(`
        CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
        ON users (LOWER(email));
    `);

    // Backward compatibility: add missing columns safely.
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id BIGINT;");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Sales';");
    await query("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'Sales';").catch(() => {});

    // Add FK constraint (ignore error if already exists).
    await query(`
        ALTER TABLE users
        ADD CONSTRAINT users_workspace_id_fk
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE RESTRICT;
    `).catch(() => {});

    // Backfill workspace_id if null.
    await query(`
        UPDATE users
        SET workspace_id = (SELECT id FROM workspaces ORDER BY id ASC LIMIT 1)
        WHERE workspace_id IS NULL;
    `);

    await query(`
        CREATE INDEX IF NOT EXISTS users_workspace_id_idx
        ON users (workspace_id);
    `);

    // ============================
    // USER SESSIONS TABLE
    // ============================
    await query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL
        );
    `);

    await query(`
        CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_hash_unique_idx
        ON user_sessions (token_hash);
    `);

    await query(`
        CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
        ON user_sessions (user_id);
    `);

    // ============================
    // CUSTOMERS TABLE
    // ============================
    await query(`
        CREATE TABLE IF NOT EXISTS customers (
            id BIGSERIAL PRIMARY KEY,
            owner_user_id BIGINT,
            workspace_id BIGINT,
            assigned_user_id BIGINT,
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

    // Add missing columns for backward compatibility.
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS owner_user_id BIGINT;");
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS workspace_id BIGINT;");
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_user_id BIGINT;");
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_lead BOOLEAN NOT NULL DEFAULT FALSE;");
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS lead_stage TEXT;");
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS deal_value NUMERIC;");

    // Add foreign keys (ignore if already exist).
    await query(`
        ALTER TABLE customers
        ADD CONSTRAINT customers_workspace_id_fk
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE;
    `).catch(() => {});

    // Backfill workspace_id for legacy records.
    await query(`
        UPDATE customers
        SET workspace_id = (SELECT id FROM workspaces ORDER BY id ASC LIMIT 1)
        WHERE workspace_id IS NULL;
    `);

    await query(`
        CREATE INDEX IF NOT EXISTS customers_workspace_id_idx
        ON customers (workspace_id);
    `);

    // Unique email per workspace (allow NULL emails).
    await query(`
        CREATE UNIQUE INDEX IF NOT EXISTS customers_workspace_email_unique_idx
        ON customers (workspace_id, LOWER(email))
        WHERE email IS NOT NULL;
    `).catch(() => {});

    // ============================
    // NOTES TABLE
    // ============================
    await query(`
        CREATE TABLE IF NOT EXISTS notes (
            id BIGSERIAL PRIMARY KEY,
            customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            workspace_id BIGINT,
            actor_user_id BIGINT,
            body TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await query("CREATE INDEX IF NOT EXISTS notes_workspace_id_idx ON notes(workspace_id);");
    await query("CREATE INDEX IF NOT EXISTS notes_customer_id_idx ON notes(customer_id);");

    // ============================
    // TASKS TABLE
    // ============================
    await query(`
        CREATE TABLE IF NOT EXISTS tasks (
            id BIGSERIAL PRIMARY KEY,
            owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            workspace_id BIGINT,
            assigned_user_id BIGINT,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            due_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            completed_at TIMESTAMPTZ
        );
    `);

    await query("CREATE INDEX IF NOT EXISTS tasks_workspace_id_idx ON tasks(workspace_id);");
    await query("CREATE INDEX IF NOT EXISTS tasks_due_at_idx ON tasks(due_at);");

    // ============================
    // ACTIVITIES TABLE
    // ============================
    await query(`
        CREATE TABLE IF NOT EXISTS activities (
            id BIGSERIAL PRIMARY KEY,
            workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
            actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
            type TEXT NOT NULL,
            data JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await query("CREATE INDEX IF NOT EXISTS activities_workspace_id_idx ON activities(workspace_id);");
    await query("CREATE INDEX IF NOT EXISTS activities_customer_id_idx ON activities(customer_id);");

    // ============================
    // NOTIFICATIONS TABLE
    // ============================
    await query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id BIGSERIAL PRIMARY KEY,
            workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
            type TEXT NOT NULL,
            data JSONB NOT NULL DEFAULT '{}'::jsonb,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await query("CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);");
    await query("CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);");
};