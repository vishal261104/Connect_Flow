import { useEffect, useState } from "react";
import { dashboardApi } from "../services/api.js";

export default function Dashboard() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setError("");
			try {
				const summary = await dashboardApi.summary();
				if (!cancelled) setData(summary);
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

	return (
		<div className="stack" style={{ gap: 14 }}>
			<div className="pageHeader">
				<div>
					<h1 className="h1">Dashboard</h1>
					<p className="subtle">Numbers only (no charts yet).</p>
				</div>
			</div>

			{error ? <div className="alert">{error}</div> : null}
			{loading ? (
				<div className="card cardPad">Loading…</div>
			) : data ? (
				<div className="grid2">
					<div className="card cardPad">
						<div className="label">Total customers</div>
						<div style={{ fontSize: 28, fontWeight: 900 }}>{data.totalCustomers ?? 0}</div>
					</div>
					<div className="card cardPad">
						<div className="label">Total leads</div>
						<div style={{ fontSize: 28, fontWeight: 900 }}>{data.totalLeads ?? 0}</div>
					</div>

					<div className="card cardPad">
						<div className="label">Leads per stage</div>
						<div className="stack" style={{ gap: 8, marginTop: 10 }}>
							<div className="rowWrap" style={{ justifyContent: "space-between" }}><span>New</span><span className="badge">{leadsPerStage.New ?? 0}</span></div>
							<div className="rowWrap" style={{ justifyContent: "space-between" }}><span>Contacted</span><span className="badge">{leadsPerStage.Contacted ?? 0}</span></div>
							<div className="rowWrap" style={{ justifyContent: "space-between" }}><span>Interested</span><span className="badge">{leadsPerStage.Interested ?? 0}</span></div>
							<div className="rowWrap" style={{ justifyContent: "space-between" }}><span>Closed</span><span className="badge">{leadsPerStage.Closed ?? 0}</span></div>
						</div>
					</div>
					<div className="card cardPad">
						<div className="label">Tasks pending today</div>
						<div style={{ fontSize: 28, fontWeight: 900 }}>{data.tasksPendingToday ?? 0}</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
