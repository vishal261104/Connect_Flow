import { useEffect, useState } from "react";
import { dashboardApi } from "../services/api.js";

import {
	ResponsiveContainer,
	BarChart,
	Bar,
	LineChart,
	Line,
	FunnelChart,
	Funnel,
	LabelList,
	CartesianGrid,
	XAxis,
	YAxis,
	Tooltip,
	Brush,
} from "recharts";

import { Alert } from "../components/ui/alert.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Card, CardContent } from "../components/ui/card.jsx";

export default function Dashboard() {
	const [data, setData] = useState(null);
	const [analytics, setAnalytics] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [revenueGranularity, setRevenueGranularity] = useState("month");
	const [revenueBrush, setRevenueBrush] = useState({ startIndex: 0, endIndex: 0 });
	const [revenueRange, setRevenueRange] = useState({ start: null, end: null });

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setError("");
			try {
				const [summary, a] = await Promise.all([
					dashboardApi.summary(),
					dashboardApi.analytics(),
				]);
				if (!cancelled) {
					setData(summary);
					setAnalytics(a);
				}
			} catch (err) {
				if (!cancelled) setError(err?.message ?? "Failed to load dashboard");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	const leadsPerStage = data?.leadsPerStage ?? { New: 0, Contacted: 0, Interested: 0, Closed: 0 };
	const customersCurrentMonthDaily = analytics?.customersCurrentMonthDaily ?? [];
	const leadCountsByStage = analytics?.leadCountsByStage ?? leadsPerStage;
	const leadValueByStage = analytics?.leadValueByStage ?? { New: 0, Contacted: 0, Interested: 0, Closed: 0 };
	const taskStatusLast30 = analytics?.taskStatusLast30 ?? { Pending: 0, Completed: 0 };
	const closedRevenueMonthly = analytics?.closedRevenueMonthly ?? [];
	const closedRevenueDaily = analytics?.closedRevenueDaily ?? [];

	const leadValueChartData = ["New", "Contacted", "Interested", "Closed"].map((stage) => ({
		stage,
		value: Number(leadValueByStage?.[stage] ?? 0),
	}));
	const primary = "hsl(var(--primary))";
	const primarySoft = "hsl(var(--primary) / 0.22)";
	const primaryMid = "hsl(var(--primary) / 0.42)";
	const primaryStrong = "hsl(var(--primary) / 0.78)";

	const totalCustomers = Number(data?.totalCustomers ?? 0);
	const totalLeads = Number(data?.totalLeads ?? 0);
	const interested = Number(leadsPerStage?.Interested ?? 0);
	const closed = Number(leadsPerStage?.Closed ?? 0);

	const funnelData = [
		{ name: "Customers", value: totalCustomers, fill: primarySoft },
		{ name: "Leads", value: totalLeads, fill: primaryMid },
		{ name: "Interested", value: interested, fill: primary },
		{ name: "Closed", value: closed, fill: primaryStrong },
	];

	const pct = (num, den) => {
		const n = Number(num);
		const d = Number(den);
		if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return "—";
		return `${Math.round((n / d) * 100)}%`;
	};

	const dayTick = (value) => {
		const s = String(value ?? "");
		const day = s.slice(-2);
		return day.startsWith("0") ? day.slice(1) : day;
	};

	const monthTick = (value) => {
		const s = String(value ?? "");
		const d = new Date(`${s}-01T00:00:00Z`);
		if (Number.isNaN(d.getTime())) return s;
		return new Intl.DateTimeFormat(undefined, { month: "short" }).format(d);
	};

	const dateTick = (value) => {
		const s = String(value ?? "");
		const d = new Date(`${s}T00:00:00Z`);
		if (Number.isNaN(d.getTime())) return s;
		return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
	};

	const moneyTick = (value) => {
		const n = Number(value ?? 0);
		if (!Number.isFinite(n)) return String(value ?? "");
		return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
	};

	const parseIsoDay = (value) => {
		const s = String(value ?? "");
		const d = new Date(`${s}T00:00:00Z`);
		return Number.isNaN(d.getTime()) ? null : d;
	};

	const dayKey = (date) => {
		if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
		const y = date.getUTCFullYear();
		const m = String(date.getUTCMonth() + 1).padStart(2, "0");
		const dd = String(date.getUTCDate()).padStart(2, "0");
		return `${y}-${m}-${dd}`;
	};

	const monthKey = (date) => {
		if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
		const y = date.getUTCFullYear();
		const m = String(date.getUTCMonth() + 1).padStart(2, "0");
		return `${y}-${m}`;
	};

	const yearKey = (date) => {
		if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
		return String(date.getUTCFullYear());
	};

	const startOfWeekUtc = (date) => {
		if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
		const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
		// Monday-based week.
		const dow = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
		d.setUTCDate(d.getUTCDate() - dow);
		return d;
	};

	const aggregateRevenue = (daily, granularity) => {
		const parsed = (daily ?? [])
			.map((r) => ({
				date: parseIsoDay(r?.day),
				revenue: Number(r?.revenue ?? 0),
			}))
			.filter((r) => r.date && Number.isFinite(r.revenue))
			.sort((a, b) => a.date.getTime() - b.date.getTime());
		if (!parsed.length) return [];

		const first = parsed[0].date;
		const last = parsed[parsed.length - 1].date;

		const sumByKey = new Map();
		const bucketStartByKey = new Map();
		for (const row of parsed) {
			let key = "";
			let start = null;
			if (granularity === "year") {
				key = yearKey(row.date);
				start = new Date(Date.UTC(row.date.getUTCFullYear(), 0, 1));
			} else if (granularity === "week") {
				start = startOfWeekUtc(row.date);
				key = start ? dayKey(start) : "";
			} else {
				key = monthKey(row.date);
				start = new Date(Date.UTC(row.date.getUTCFullYear(), row.date.getUTCMonth(), 1));
			}
			if (!key || !start) continue;
			bucketStartByKey.set(key, start);
			sumByKey.set(key, Number(sumByKey.get(key) ?? 0) + row.revenue);
		}

		const keysInOrder = (() => {
			const keys = [];
			if (granularity === "year") {
				const startY = first.getUTCFullYear();
				const endY = last.getUTCFullYear();
				for (let y = startY; y <= endY; y += 1) keys.push(String(y));
				return keys;
			}
			if (granularity === "week") {
				let d = startOfWeekUtc(first);
				const end = startOfWeekUtc(last);
				if (!d || !end) return [];
				while (d.getTime() <= end.getTime()) {
					keys.push(dayKey(d));
					d = new Date(d);
					d.setUTCDate(d.getUTCDate() + 7);
				}
				return keys;
			}
			// month
			let d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
			const end = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1));
			while (d.getTime() <= end.getTime()) {
				keys.push(monthKey(d));
				d = new Date(d);
				d.setUTCMonth(d.getUTCMonth() + 1);
			}
			return keys;
		})();

		return keysInOrder.map((key) => ({
			x: key,
			revenue: Number(sumByKey.get(key) ?? 0),
			start: bucketStartByKey.get(key) ?? null,
		}));
	};

	const revenueSeries = (() => {
		// Prefer daily-backed aggregation; if older server is running, fall back to existing monthly array.
		if (closedRevenueDaily.length) return aggregateRevenue(closedRevenueDaily, revenueGranularity);
		if (revenueGranularity !== "month") return [];
		return (closedRevenueMonthly ?? []).map((r) => ({ x: String(r?.month ?? ""), revenue: Number(r?.revenue ?? 0), start: null }));
	})();

	const indicesForRange = (series, range) => {
		const items = Array.isArray(series) ? series : [];
		if (!items.length) return { startIndex: 0, endIndex: 0 };
		if (!range?.start || !range?.end) return { startIndex: 0, endIndex: items.length - 1 };
		const startMs = range.start.getTime();
		const endMs = range.end.getTime();
		let startIndex = 0;
		let endIndex = items.length - 1;
		for (let i = 0; i < items.length; i += 1) {
			const ms = items[i]?.start instanceof Date ? items[i].start.getTime() : null;
			if (ms != null && ms >= startMs) {
				startIndex = i;
				break;
			}
		}
		for (let i = items.length - 1; i >= 0; i -= 1) {
			const ms = items[i]?.start instanceof Date ? items[i].start.getTime() : null;
			if (ms != null && ms <= endMs) {
				endIndex = i;
				break;
			}
		}
		if (endIndex < startIndex) return { startIndex: 0, endIndex: items.length - 1 };
		return { startIndex, endIndex };
	};

	// Keep brush synced when series/granularity changes.
	useEffect(() => {
		if (!revenueSeries.length) return;
		setRevenueBrush((prev) => {
			const next = indicesForRange(revenueSeries, revenueRange);
			if (prev.startIndex === next.startIndex && prev.endIndex === next.endIndex) return prev;
			return next;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [revenueGranularity, closedRevenueDaily, closedRevenueMonthly]);

	useEffect(() => {
		if (!closedRevenueDaily.length) return;
		const first = parseIsoDay(closedRevenueDaily[0]?.day);
		const last = parseIsoDay(closedRevenueDaily[closedRevenueDaily.length - 1]?.day);
		if (!first || !last) return;
		if (!revenueRange.start || !revenueRange.end) {
			setRevenueRange({ start: first, end: last });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [closedRevenueDaily]);

	const onRevenueBrushChange = (next) => {
		if (!next || typeof next.startIndex !== "number" || typeof next.endIndex !== "number") return;
		setRevenueBrush({ startIndex: next.startIndex, endIndex: next.endIndex });
		const start = revenueSeries?.[next.startIndex]?.start ?? null;
		const end = revenueSeries?.[next.endIndex]?.start ?? null;
		if (start && end) {
			setRevenueRange({ start, end });

			const days = Math.abs(end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
			const desired = days > 540 ? "year" : days > 180 ? "month" : "week";
			if (desired !== revenueGranularity) setRevenueGranularity(desired);
		}
	};

	return (
		<div className="stack" style={{ gap: 14 }}>
			<div className="pageHeader">
				<div>
					<h1 className="h1">Dashboard</h1>
				</div>
			</div>

			{error ? <Alert>{error}</Alert> : null}
			{loading ? (
				<Card>
					<CardContent className="pt-5">Loading…</CardContent>
				</Card>
			) : data ? (
				<div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
					<Card>
						<CardContent className="pt-5">
						<div className="label">Total customers</div>
						<div style={{ fontSize: 28, fontWeight: 900 }}>{data.totalCustomers ?? 0}</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-5">
						<div className="label">Total leads</div>
						<div style={{ fontSize: 28, fontWeight: 900 }}>{data.totalLeads ?? 0}</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="pt-5">
						<div className="label">Revenue (Closed)</div>
						<div style={{ fontSize: 28, fontWeight: 900 }}>{analytics?.revenue?.closedRevenue ?? 0}</div>
						<div className="small subtle" style={{ marginTop: 6 }}>
							Pipeline value: {analytics?.revenue?.pipelineValue ?? 0}
						</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-5">
						<div className="label">Tasks (last 30 days)</div>
						<div className="rowWrap" style={{ justifyContent: "space-between", marginTop: 10 }}>
							<span>Pending</span>
							<Badge>{taskStatusLast30.Pending ?? 0}</Badge>
						</div>
						<div className="rowWrap" style={{ justifyContent: "space-between", marginTop: 8 }}>
							<span>Completed</span>
							<Badge>{taskStatusLast30.Completed ?? 0}</Badge>
						</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="pt-5">
						<div className="label">Monthly Revenue Trend (Closed)</div>
						<div style={{ height: 220, marginTop: 10 }}>
							<ResponsiveContainer width="100%" height="100%">
								<LineChart
									data={revenueSeries}
									margin={{ top: 8, right: 10, bottom: 0, left: 28 }}
								>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis
										dataKey="x"
										tickFormatter={
											revenueGranularity === "year"
												? (v) => String(v ?? "")
											: revenueGranularity === "week"
												? dateTick
												: monthTick
										}
									/>
									<YAxis width={86} tickFormatter={moneyTick} />
									<Tooltip />
									<Line type="monotone" dataKey="revenue" stroke={primary} strokeWidth={2} dot={false} isAnimationActive={false} />
									{revenueSeries.length > 2 ? (
										<Brush
											dataKey="x"
											height={22}
											stroke={primary}
											startIndex={revenueBrush.startIndex}
											endIndex={revenueBrush.endIndex}
											onChange={onRevenueBrushChange}
											travellerWidth={10}
										/>
									) : null}
								</LineChart>
							</ResponsiveContainer>
						</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-5">
						<div className="label">Customers created (this month)</div>
						<div style={{ height: 220, marginTop: 10 }}>
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={customersCurrentMonthDaily} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="day" tickFormatter={dayTick} />
									<YAxis allowDecimals={false} />
									<Tooltip />
									<Line type="monotone" dataKey="count" stroke={primary} strokeWidth={2} dot={false} />
								</LineChart>
							</ResponsiveContainer>
						</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="pt-5">
						<div className="label">Deal value by stage</div>
						<div style={{ height: 220, marginTop: 10 }}>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={leadValueChartData} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="stage" />
									<YAxis />
									<Tooltip />
									<Bar dataKey="value" fill={primary} />
								</BarChart>
							</ResponsiveContainer>
						</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="pt-5">
						<div className="label">Conversion funnel</div>
						<div className="small subtle" style={{ marginTop: 6 }}>
							Leads: {pct(totalLeads, totalCustomers)} • Interested: {pct(interested, totalLeads)} • Closed: {pct(closed, totalLeads)}
						</div>
						<div style={{ height: 220, marginTop: 10 }}>
							<ResponsiveContainer width="100%" height="100%">
								<FunnelChart>
									<Tooltip />
									<Funnel dataKey="value" data={funnelData} isAnimationActive={false}>
										<LabelList position="right" dataKey="name" />
										<LabelList position="inside" dataKey="value" fill="hsl(var(--primary-foreground))" />
									</Funnel>
								</FunnelChart>
							</ResponsiveContainer>
						</div>
						</CardContent>
					</Card>
				</div>
			) : null}
		</div>
	);
}
