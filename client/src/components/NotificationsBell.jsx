import { useEffect, useMemo, useRef, useState } from "react";
import { FiBell, FiCheck } from "react-icons/fi";
import { io } from "socket.io-client";

import { useAuth } from "../auth/AuthContext.jsx";
import { authToken, notificationsApi } from "../services/api.js";

import { Alert } from "./ui/alert.jsx";
import { Badge } from "./ui/badge.jsx";
import { Button } from "./ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card.jsx";

const formatDateTime = (value) => {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
};

const toLabel = (n) => {
	const t = String(n?.type ?? "");
	const data = n?.data ?? {};
	if (t === "TASK_ASSIGNED") return `Task assigned: ${data?.title ?? ""}`.trim();
	if (t === "TASK_COMPLETED") return `Task completed: ${data?.title ?? ""}`.trim();
	if (t === "CUSTOMER_ASSIGNED") return `Customer assigned: ${data?.customerName ?? ""}`.trim();
	return t || "Notification";
};

export default function NotificationsBell() {
	const { user } = useAuth();
	const [open, setOpen] = useState(false);
	const [unread, setUnread] = useState(0);
	const [items, setItems] = useState([]);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [toasts, setToasts] = useState([]);

	const socketRef = useRef(null);

	const canShow = Boolean(user);

	const badge = useMemo(() => {
		if (!unread) return null;
		return (
			<span
				className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold"
				style={{ minWidth: 18, height: 18, padding: "0 6px", marginLeft: -10, marginTop: -10 }}
			>
				{unread > 99 ? "99+" : unread}
			</span>
		);
	}, [unread]);

	useEffect(() => {
		let cancelled = false;
		if (!user) {
			setUnread(0);
			return;
		}
		const load = async () => {
			try {
				const result = await notificationsApi.unreadCount();
				if (!cancelled) setUnread(Number(result?.unread ?? 0));
			} catch {
				// ignore
			}
		};
		load();
		const id = setInterval(load, 30_000);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, [user]);

	useEffect(() => {
		if (!user) return;
		const token = authToken.get();
		if (!token) return;

		const socket = io(undefined, {
			auth: { token },
			transports: ["websocket", "polling"],
		});
		socketRef.current = socket;

		socket.on("notification:new", (notif) => {
			setUnread((u) => u + 1);
			setItems((prev) => [notif, ...(prev ?? [])].slice(0, 50));
			setToasts((prev) => {
				const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
				return [{ id, title: toLabel(notif) }, ...(prev ?? [])].slice(0, 3);
			});
		});

		socket.on("connect_error", () => {
			// ignore
		});

		return () => {
			socket.off("notification:new");
			socket.disconnect();
			socketRef.current = null;
		};
	}, [user]);

	useEffect(() => {
		if (!toasts.length) return;
		const id = setInterval(() => {
			setToasts((prev) => (prev ?? []).slice(0, -1));
		}, 4500);
		return () => clearInterval(id);
	}, [toasts.length]);

	useEffect(() => {
		let cancelled = false;
		if (!open || !user) return;
		const load = async () => {
			setLoading(true);
			setError("");
			try {
				const data = await notificationsApi.list({ limit: 30 });
				if (!cancelled) setItems(Array.isArray(data) ? data : []);
				const c = await notificationsApi.unreadCount();
				if (!cancelled) setUnread(Number(c?.unread ?? 0));
			} catch (e) {
				if (!cancelled) setError(e?.message ?? "Failed to load notifications");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [open, user]);

	const markAll = async () => {
		setError("");
		try {
			await notificationsApi.markAllRead();
			setUnread(0);
			setItems((prev) => (prev ?? []).map((n) => ({ ...n, is_read: true })));
		} catch (e) {
			setError(e?.message ?? "Failed to mark all read");
		}
	};

	const markOne = async (id) => {
		setError("");
		try {
			const updated = await notificationsApi.markRead(id);
			setItems((prev) => (prev ?? []).map((n) => (n.id === id ? updated : n)));
			const c = await notificationsApi.unreadCount();
			setUnread(Number(c?.unread ?? 0));
		} catch (e) {
			setError(e?.message ?? "Failed to mark read");
		}
	};

	if (!canShow) return null;

	return (
		<div style={{ position: "relative" }}>
			{toasts.length ? (
				<div style={{ position: "fixed", right: 18, top: 76, zIndex: 60, width: 360 }}>
					<div className="stack" style={{ gap: 10 }}>
						{toasts.map((t) => (
							<Card key={t.id}>
								<CardContent style={{ paddingTop: 12, paddingBottom: 12 }}>
									<div style={{ fontWeight: 800, fontSize: 13 }}>New notification</div>
									<div className="small subtle">{t.title}</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			) : null}

			<Button variant="outline" type="button" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
				<FiBell aria-hidden="true" />
				{badge}
			</Button>

			{open ? (
				<div style={{ position: "absolute", right: 0, top: 46, width: 360, zIndex: 30 }}>
					<Card>
						<CardHeader className="pb-2">
							<div className="rowWrap" style={{ justifyContent: "space-between" }}>
								<div>
									<CardTitle>Notifications</CardTitle>
									<CardDescription>{unread ? `${unread} unread` : "All caught up"}</CardDescription>
								</div>
								<div className="rowWrap">
									<Button variant="outline" size="sm" type="button" onClick={markAll} disabled={!items.length}>
										<FiCheck aria-hidden="true" /> Mark all read
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-0">
							{error ? <Alert>{error}</Alert> : null}
							{loading ? (
								<div className="small">Loading…</div>
							) : items.length === 0 ? (
								<div className="small">No notifications yet.</div>
							) : (
								<div className="stack" style={{ gap: 10 }}>
									{items.map((n) => (
										<div key={n.id} className="rowWrap" style={{ justifyContent: "space-between", gap: 10 }}>
											<div style={{ minWidth: 0 }}>
												<div style={{ fontWeight: 700, fontSize: 13 }}>{toLabel(n)}</div>
												<div className="small subtle">{formatDateTime(n.created_at)}</div>
											</div>
											<div className="rowWrap" style={{ gap: 8 }}>
												{n.is_read ? <Badge>Read</Badge> : <Badge variant="primary">Unread</Badge>}
												<Button
													variant="outline"
													size="sm"
													type="button"
													onClick={() => markOne(n.id)}
													disabled={n.is_read}
												>
													Mark read
												</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			) : null}
		</div>
	);
}
