import { useEffect, useMemo, useState } from "react";
import { activitiesApi } from "../services/api.js";
import { cn } from "../lib/utils.js";

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
					<div className="overflow-y-auto pr-1 pb-4" style={{ maxHeight: maxWindowHeight }}>
						<div className="relative py-2">
							{/* Vertical Line */}
							<div className="absolute left-[27px] top-6 bottom-2 w-[2px] bg-gradient-to-b from-blue-400/60 to-purple-500/60 dark:from-blue-500/40 dark:to-purple-600/40" />

							<div className="space-y-8">
								{grouped.map((g) => (
									<div key={g.label} className="space-y-6">
										{/* Group Header */}
										<div className="relative flex gap-6 items-center px-5 z-10">
											<div className="h-3 w-3 rounded-full border-2 border-white bg-slate-300 dark:border-neutral-800 shrink-0 ml-[2px]" />
											<div className="font-semibold text-gray-500">{g.label}</div>
										</div>

										{/* Items */}
										{g.items.map((a) => (
											<div key={a.id} className="relative flex gap-6 items-start px-5 animate-fade-in">
												{/* Node */}
												<div className="relative z-10 mt-1.5 shrink-0">
													<div
														className={cn(
															"h-4 w-4 rounded-full border-2 border-white dark:border-neutral-800",
															"bg-gradient-to-r from-blue-400 to-purple-500",
															"shadow-[0_0_12px_rgba(59,130,246,0.6)]",
															"transition-transform duration-200 hover:scale-110"
														)}
													/>
												</div>

												{/* Content Card */}
												<div
													className={cn(
														"flex-1 rounded-lg p-4 backdrop-blur-xl",
														"bg-white/70 dark:bg-neutral-900/70",
														"border border-gray-200/50 dark:border-white/10",
														"shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
														"hover:shadow-[0_10px_36px_rgba(0,0,0,0.15)] transition-all duration-300"
													)}
												>
													<div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
														<div style={{ minWidth: 0 }}>
															<span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
																{formatDateTime(a.created_at)}
															</span>
															<h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
																{toLabel(a)}
															</h3>
														</div>
														<Badge className="shrink-0">{String(a.type ?? "")}</Badge>
													</div>
												</div>
											</div>
										))}
									</div>
								))}
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
