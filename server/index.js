import "dotenv/config";
import express from "express";
import cors from "cors";

import { connectDB, ensureSchema } from "./config/db.js";
import { logger } from "./utils/logger.js";
import customersRouter from "./routes/customers.js";
import notesRouter from "./routes/notes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/customers", customersRouter);
app.use("/api/customers/:customerId/notes", notesRouter);

// Basic error handler
app.use((err, req, res, next) => {
	logger.error("Unhandled error", { message: err?.message, stack: err?.stack });
	const status = Number(err?.status) || 500;

	// Postgres unique constraint violation.
	if (err?.code === "23505") {
		return res.status(409).json({ message: "Conflict" });
	}

	return res.status(status).json({ message: status === 500 ? "Internal Server Error" : err?.message });
});

const port = Number(process.env.PORT ?? 5000);
const host = (process.env.HOST ?? "0.0.0.0").trim();

const start = async () => {
	await connectDB();
	await ensureSchema();

	app.listen(port, host, () => {
		logger.info(`Server listening`, { host, port });
	});
};

start().catch((err) => {
	logger.error("Failed to start server", { message: err?.message, stack: err?.stack });
	process.exit(1);
});
