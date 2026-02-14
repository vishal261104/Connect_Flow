import { useEffect, useMemo, useState } from "react";
import { activitiesApi } from "../services/api.js";

import { Alert } from "./ui/alert.jsx";
import { Badge } from "./ui/badge.jsx";
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

const toLabel = (a) => {
	const t = String(a?.type ?? "");
	if (t === "CUSTOMER_CREATED") return "Customer created";
	if (t === "CUSTOMER_UPDATED") return "Customer updated";
	if (t === "NOTE_ADDED") return "Note added";
	if (t === "NOTE_UPDATED") return "Note updated";
	if (t === "NOTE_DELETED") return "Note deleted";
	if (t === "TASK_CREATED") return "Task created";
	if (t === "TASK_UPDATED") return "Task updated";
	if (t === "LEAD_CONVERTED") return "Converted to lead";
	if (t === "LEAD_STAGE_CHANGED") return "Lead stage changed";
	return t || "Activity";
};

const startOfDay = (d) => {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x.getTime();
};

const dayLabel = (iso) => {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	const now = new Date();
	const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

export default function ActivityTimeline({ customerId }) {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const maxWindowHeight = 320; // keeps roughly ~5 activities visible without growing the page

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setError("");
			try {
				const data = await activitiesApi.listByCustomer(customerId, { limit: 80 });
				if (!cancelled) setItems(Array.isArray(data) ? data : []);
			} catch (e) {
				if (!cancelled) setError(e?.message ?? "Failed to load activity");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [customerId]);

	const countLabel = useMemo(() => {
		const c = items?.length ?? 0;
		return `${c} event${c === 1 ? "" : "s"}`;
	}, [items]);

	const grouped = useMemo(() => {
		const groups = [];
		const map = new Map();
		for (const a of items ?? []) {
			const label = dayLabel(a.created_at);
			if (!map.has(label)) {
				const bucket = { label, items: [] };
				map.set(label, bucket);
				groups.push(bucket);
			}
			map.get(label).items.push(a);
		}
		return groups;
	}, [items]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Activity</CardTitle>
				<CardDescription>{countLabel}</CardDescription>
			</CardHeader>
			<CardContent className="pt-0">
				{error ? <Alert>{error}</Alert> : null}
				{loading ? (
					<div className="small">Loading activity…</div>
				) : items.length === 0 ? (
					<div className="small">No activity yet.</div>
				) : (
					<div className="overflow-y-auto pr-1" style={{ maxHeight: maxWindowHeight }}>
						<div className="stack" style={{ gap: 14 }}>
							{grouped.map((g) => (
								<div key={g.label} className="stack" style={{ gap: 10 }}>
									<div className="rowWrap" style={{ justifyContent: "space-between" }}>
										<div className="label">{g.label}</div>
										<Badge>{g.items.length}</Badge>
									</div>
									{g.items.map((a) => (
										<div key={a.id} className="rowWrap" style={{ justifyContent: "space-between", gap: 10 }}>
											<div style={{ minWidth: 0 }}>
												<div style={{ fontWeight: 750 }}>{toLabel(a)}</div>
												<div className="small subtle">{formatDateTime(a.created_at)}</div>
											</div>
											<Badge>{String(a.type ?? "")}</Badge>
										</div>
									))}
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
