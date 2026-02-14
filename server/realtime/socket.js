import crypto from "node:crypto";
import { Server } from "socket.io";
import { getUserSessionByToken } from "../models/sessionModel.js";
import { logger } from "../utils/logger.js";
import { setIO } from "./emitter.js";

const sha256Hex = (value) => crypto.createHash("sha256").update(value).digest("hex");

export const attachSocketIO = (httpServer, { corsOrigin = "*" } = {}) => {
	const io = new Server(httpServer, {
		cors: { origin: corsOrigin },
	});

	io.use(async (socket, next) => {
		try {
			const token = String(socket.handshake.auth?.token ?? "").trim();
			if (!token) return next(new Error("Unauthorized"));

			const session = await getUserSessionByToken({ tokenHash: sha256Hex(token) });
			if (!session) return next(new Error("Unauthorized"));

			socket.data.user = {
				id: Number(session.user_id),
				email: session.email,
				workspaceId: Number(session.workspace_id),
				role: String(session.role ?? "").trim() || "Viewer",
			};

			return next();
		} catch (err) {
			return next(err);
		}
	});

	io.on("connection", (socket) => {
		const user = socket.data.user;
		const userRoom = `user:${user.id}`;
		socket.join(userRoom);

		logger.info("Socket connected", { userId: user.id, workspaceId: user.workspaceId });

		socket.emit("connected", { ok: true, user: { id: user.id, workspaceId: user.workspaceId, role: user.role } });

		socket.on("disconnect", (reason) => {
			logger.info("Socket disconnected", { userId: user.id, reason });
		});
	});

	setIO(io);
	return io;
};
