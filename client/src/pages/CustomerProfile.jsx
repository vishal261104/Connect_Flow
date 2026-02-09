import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { customersApi, leadsApi } from "../services/api.js";
import NotesSection from "../components/NotesSection.jsx";
import TasksSection from "../components/TasksSection.jsx";

import { FiArrowLeft, FiEdit2, FiList, FiSave, FiTrendingUp } from "react-icons/fi";

const formatDate = (value) => {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "2-digit",
	}).format(date);
};

export default function CustomerProfile() {
	const { id } = useParams();
	const customerId = Number(id);
	const navigate = useNavigate();

	const [customer, setCustomer] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [leadSaving, setLeadSaving] = useState(false);
	const [dealValue, setDealValue] = useState("");

	const headerSubtitle = useMemo(() => {
		if (!customer) return "";
		const bits = [customer.company, customer.email, customer.phone].filter(Boolean);
		return bits.length ? bits.join(" • ") : "Customer details";
	}, [customer]);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setError("");
			try {
				const data = await customersApi.get(customerId);
				if (!cancelled) {
					setCustomer(data);
					setDealValue(data?.deal_value != null ? String(data.deal_value) : "");
				}
			} catch (err) {
				if (!cancelled) setError(err?.message ?? "Failed to load customer");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		if (!Number.isInteger(customerId) || customerId <= 0) {
			setError("Invalid customer id");
			setLoading(false);
			return;
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [customerId]);

	const convertToLead = async () => {
		if (!customer) return;
		setLeadSaving(true);
		setError("");
		try {
			const updated = await leadsApi.convert(customer.id, {});
			setCustomer(updated);
		} catch (err) {
			setError(err?.message ?? "Failed to convert to lead");
		} finally {
			setLeadSaving(false);
		}
	};

	const updateLeadStage = async (stage) => {
		if (!customer) return;
		setLeadSaving(true);
		setError("");
		try {
			const deal = dealValue.trim() === "" ? null : Number(dealValue);
			if (dealValue.trim() !== "" && (!Number.isFinite(deal) || deal < 0)) {
				setError("Deal value must be a valid number");
				return;
			}
			const updated = await leadsApi.update(customer.id, { lead_stage: stage, deal_value: deal });
			setCustomer(updated);
			setDealValue(updated?.deal_value != null ? String(updated.deal_value) : "");
		} catch (err) {
			setError(err?.message ?? "Failed to update lead stage");
		} finally {
			setLeadSaving(false);
		}
	};

	const saveDealValue = async () => {
		if (!customer?.is_lead) return;
		setLeadSaving(true);
		setError("");
		try {
			const deal = dealValue.trim() === "" ? null : Number(dealValue);
			if (dealValue.trim() !== "" && (!Number.isFinite(deal) || deal < 0)) {
				setError("Deal value must be a valid number");
				return;
			}
			const updated = await leadsApi.update(customer.id, { lead_stage: customer.lead_stage || "New", deal_value: deal });
			setCustomer(updated);
			setDealValue(updated?.deal_value != null ? String(updated.deal_value) : "");
		} catch (err) {
			setError(err?.message ?? "Failed to update deal value");
		} finally {
			setLeadSaving(false);
		}
	};

	return (
		<div className="stack" style={{ gap: 14 }}>
			<div className="pageHeader">
				<div>
					<h1 className="h1">{customer?.name ?? "Customer"}</h1>
					<p className="subtle">{headerSubtitle}</p>
				</div>
				<div className="rowWrap">
					<Link className="btn" to="/customers">
						<FiList aria-hidden="true" /> All customers
					</Link>
					<Link className="btn" to={`/customers/${customerId}/edit`}>
						<FiEdit2 aria-hidden="true" /> Edit
					</Link>
				</div>
			</div>

			{error ? (
				<div className="alert">
					<div style={{ fontWeight: 800 }}>Couldn’t load customer</div>
					<div className="small" style={{ marginTop: 6 }}>
						{error}
					</div>
					<div className="rowWrap" style={{ marginTop: 10 }}>
						<button className="btn" onClick={() => navigate("/customers")}>
							<FiArrowLeft aria-hidden="true" /> Back
						</button>
					</div>
				</div>
			) : null}

			{loading ? (
				<div className="card cardPad">Loading profile…</div>
			) : customer ? (
				<div className="grid2">
					<section className="card">
						<div className="kv">
							<div className="kvKey">Customer ID</div>
							<div className="kvVal mono">#{customer.id}</div>
							<div className="kvKey">Company</div>
							<div className="kvVal">{customer.company || "—"}</div>
							<div className="kvKey">Phone</div>
							<div className="kvVal">{customer.phone || "—"}</div>
							<div className="kvKey">Email</div>
							<div className="kvVal">{customer.email || "—"}</div>
							<div className="kvKey">Created</div>
							<div className="kvVal">{formatDate(customer.created_at)}</div>
							<div className="kvKey">Updated</div>
							<div className="kvVal">{formatDate(customer.updated_at)}</div>
						</div>
					</section>

					<section className="stack" style={{ gap: 14 }}>
						<section className="card">
							<div className="cardPad" style={{ borderBottom: "1px solid var(--border)" }}>
								<div style={{ fontWeight: 900 }}>Lead</div>
								<div className="small subtle" style={{ marginTop: 4 }}>Track sales stage for this customer.</div>
							</div>
							<div className="cardPad">
								{customer.is_lead ? (
									<div className="stack" style={{ gap: 12 }}>
										<div className="rowWrap" style={{ justifyContent: "space-between" }}>
											<div style={{ minWidth: 220 }}>
												<div className="label">Stage</div>
												<select className="input" value={customer.lead_stage || "New"} onChange={(e) => updateLeadStage(e.target.value)} disabled={leadSaving}>
													<option value="New">New</option>
													<option value="Contacted">Contacted</option>
													<option value="Interested">Interested</option>
													<option value="Closed">Closed</option>
												</select>
											</div>
											<div className="badge">Lead</div>
										</div>

										<div className="rowWrap" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
											<div style={{ flex: 1, minWidth: 220 }}>
												<div className="label">Deal value (optional)</div>
												<input className="input" type="number" min="0" step="0.01" value={dealValue} onChange={(e) => setDealValue(e.target.value)} disabled={leadSaving} placeholder="e.g. 50000" />
											</div>
											<button className="btn" type="button" onClick={saveDealValue} disabled={leadSaving}>
												<FiSave aria-hidden="true" /> {leadSaving ? "Saving…" : "Save"}
											</button>
										</div>
									</div>
								) : (
									<div className="rowWrap" style={{ justifyContent: "space-between" }}>
										<div>
											<div style={{ fontWeight: 800 }}>Not a lead yet</div>
											<div className="small subtle">Convert to start tracking stages.</div>
										</div>
										<button className="btn btnPrimary" type="button" onClick={convertToLead} disabled={leadSaving}>
											<FiTrendingUp aria-hidden="true" /> {leadSaving ? "Working…" : "Convert to lead"}
										</button>
									</div>
								)}
							</div>
						</section>

						<TasksSection customerId={customerId} />
						<NotesSection customerId={customerId} />
					</section>
				</div>
			) : null}
		</div>
	);
}
