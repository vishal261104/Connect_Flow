import { useEffect, useMemo, useState } from "react";
import { leadsApi } from "../services/api.js";

import { Alert } from "../components/ui/alert.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";

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

	const stageWindowHeight = 420; // keeps ~5 cards visible without increasing page height

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
					<Badge>{leads.length} leads</Badge>
				</div>
			</div>

			{error ? <Alert>{error}</Alert> : null}
			{loading ? (
				<Card>
					<CardContent className="pt-5">Loading leads…</CardContent>
				</Card>
			) : (
				<div className="rowWrap" style={{ alignItems: "flex-start" }}>
					{STAGES.map((stage) => (
						<Card key={stage} style={{ flex: 1, minWidth: 240 }}>
							<CardHeader className="pb-3">
								<div className="rowWrap" style={{ justifyContent: "space-between" }}>
									<CardTitle>{stage}</CardTitle>
									<Badge>{byStage[stage]?.length ?? 0}</Badge>
								</div>
							</CardHeader>
							<CardContent className="pt-3">
								{(byStage[stage] ?? []).length ? (
									<div className="overflow-y-auto pr-1" style={{ maxHeight: stageWindowHeight }}>
										<div className="stack" style={{ gap: 10 }}>
											{byStage[stage].map((lead, idx) => (
												<Card key={lead.id} className="rounded-xl">
													<CardContent className="pt-5" style={{ paddingTop: 12, paddingBottom: 12 }}>
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
																className="flex h-10 w-full max-w-[160px] rounded-md border border-input bg-white/90 px-3 py-2 text-sm shadow-soft ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
																value={STAGES.includes(lead.lead_stage) ? lead.lead_stage : "New"}
																disabled={savingId === lead.id}
																onChange={(e) => setStage(lead.id, e.target.value)}
															>
																{STAGES.map((s) => (
																	<option key={s} value={s}>
																		{s}
																	</option>
																))}
															</select>
															<Badge className="mono" title={`ID: ${lead.id}`}>#{idx + 1}</Badge>
														</div>
													</CardContent>
												</Card>
											))}
										</div>
									</div>
								) : (
									<div className="small subtle">No leads in this stage.</div>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
