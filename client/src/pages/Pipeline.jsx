import { useEffect, useMemo, useState } from "react";
import { leadsApi } from "../services/api.js";

const STAGES = ["New", "Contacted", "Interested", "Closed"];

const formatDeal = (value) => {
	if (value == null || value === "") return "";
	const n = Number(value);
	if (!Number.isFinite(n)) return "";
	return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export default function Pipeline() {
	const [leads, setLeads] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [savingId, setSavingId] = useState(0);

	const load = async () => {
		setLoading(true);
		setError("");
		try {
			const data = await leadsApi.list();
			setLeads(Array.isArray(data) ? data : []);
		} catch (err) {
			setError(err?.message ?? "Failed to load leads");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		let cancelled = false;
		const run = async () => {
			await load();
			if (cancelled) return;
		};
		run();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const byStage = useMemo(() => {
		const map = Object.fromEntries(STAGES.map((s) => [s, []]));
		for (const lead of leads ?? []) {
			const stage = STAGES.includes(lead?.lead_stage) ? lead.lead_stage : "New";
			map[stage].push(lead);
		}
		return map;
	}, [leads]);

	const setStage = async (leadId, stage) => {
		setSavingId(leadId);
		setError("");
		try {
			const updated = await leadsApi.update(leadId, { lead_stage: stage });
			setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
		} catch (err) {
			setError(err?.message ?? "Failed to update stage");
		} finally {
			setSavingId(0);
		}
	};

	return (
		<div className="stack" style={{ gap: 14 }}>
			<div className="pageHeader">
				<div>
					<h1 className="h1">Sales pipeline</h1>
					<p className="subtle">New → Contacted → Interested → Closed</p>
				</div>
				<div className="rowWrap">
					<div className="badge">{leads.length} leads</div>
				</div>
			</div>

			{error ? <div className="alert">{error}</div> : null}
			{loading ? (
				<div className="card cardPad">Loading leads…</div>
			) : (
				<div className="rowWrap" style={{ alignItems: "flex-start" }}>
					{STAGES.map((stage) => (
						<div key={stage} className="card" style={{ flex: 1, minWidth: 240 }}>
							<div className="cardPad" style={{ borderBottom: "1px solid var(--border)" }}>
								<div className="rowWrap" style={{ justifyContent: "space-between" }}>
									<div style={{ fontWeight: 900 }}>{stage}</div>
									<div className="badge">{byStage[stage]?.length ?? 0}</div>
								</div>
							</div>
							<div className="cardPad stack" style={{ gap: 10 }}>
								{(byStage[stage] ?? []).length ? (
									byStage[stage].map((lead, idx) => (
										<div key={lead.id} className="card" style={{ borderRadius: 12 }}>
											<div className="cardPad" style={{ padding: 12 }}>
												<div style={{ fontWeight: 850 }}>{lead.name}</div>
												<div className="small subtle" style={{ marginTop: 4 }}>
													{[lead.phone, lead.email].filter(Boolean).join(" • ") || "No contact"}
												</div>
												{lead.deal_value != null ? (
													<div className="small" style={{ marginTop: 6 }}>
														Deal: <span className="mono">{formatDeal(lead.deal_value)}</span>
													</div>
												) : null}

												<div className="rowWrap" style={{ justifyContent: "space-between", marginTop: 10 }}>
													<select
														className="input"
														value={STAGES.includes(lead.lead_stage) ? lead.lead_stage : "New"}
														disabled={savingId === lead.id}
														onChange={(e) => setStage(lead.id, e.target.value)}
														style={{ maxWidth: 160 }}
													>
														{STAGES.map((s) => (
															<option key={s} value={s}>
																{s}
															</option>
														))}
													</select>
													<div className="badge mono" title={`ID: ${lead.id}`}>#{idx + 1}</div>
												</div>
											</div>
										</div>
									))
								) : (
									<div className="small subtle">No leads in this stage.</div>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
