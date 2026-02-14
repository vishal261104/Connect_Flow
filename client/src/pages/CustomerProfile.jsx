import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { customersApi, leadsApi, usersApi } from "../services/api.js";
import NotesSection from "../components/NotesSection.jsx";
import TasksSection from "../components/TasksSection.jsx";
import ActivityTimeline from "../components/ActivityTimeline.jsx";

import { FiArrowLeft, FiEdit2, FiList, FiSave, FiTrendingUp } from "react-icons/fi";

import { Alert } from "../components/ui/alert.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card.jsx";
import { Input } from "../components/ui/input.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

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
	const { user } = useAuth();
	const role = String(user?.role ?? "");

	const [customer, setCustomer] = useState(null);
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [leadSaving, setLeadSaving] = useState(false);
	const [dealValue, setDealValue] = useState("");

	const assignedLabel = useMemo(() => {
		const id = customer?.assigned_user_id;
		if (id == null) return "Unassigned";
		const match = (users ?? []).find((u) => Number(u.id) === Number(id));
		return match?.email ? `${match.email} (${match.role ?? "Viewer"})` : `User #${id}`;
	}, [customer?.assigned_user_id, users]);

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
				const [data, usersList] = await Promise.all([
					customersApi.get(customerId),
					usersApi.list().catch(() => []),
				]);
				if (!cancelled) {
					setCustomer(data);
					setUsers(Array.isArray(usersList) ? usersList : []);
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
					<Button asChild variant="outline">
						<Link to="/customers">
							<FiList aria-hidden="true" /> All customers
						</Link>
					</Button>
					{role !== "Viewer" ? (
						<Button asChild variant="outline">
							<Link to={`/customers/${customerId}/edit`}>
								<FiEdit2 aria-hidden="true" /> Edit
							</Link>
						</Button>
					) : null}
				</div>
			</div>

			{error ? (
				<Alert>
					<div style={{ fontWeight: 800 }}>Couldn’t load customer</div>
					<div className="small" style={{ marginTop: 6 }}>
						{error}
					</div>
					<div className="rowWrap" style={{ marginTop: 10 }}>
						<Button variant="outline" onClick={() => navigate("/customers")}>
							<FiArrowLeft aria-hidden="true" /> Back
						</Button>
					</div>
				</Alert>
			) : null}

			{loading ? (
				<Card>
					<CardContent className="pt-5">Loading profile…</CardContent>
				</Card>
			) : customer ? (
				<div className="grid grid-cols-1 gap-3 min-[800px]:grid-cols-[1.2fr_.8fr]">
					<Card>
						<CardHeader>
							<CardTitle>Details</CardTitle>
							<CardDescription>Customer record overview</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
								<div className="text-muted-foreground">Customer ID</div>
								<div className="mono">#{customer.id}</div>
								<div className="text-muted-foreground">Company</div>
								<div>{customer.company || "—"}</div>
								<div className="text-muted-foreground">Phone</div>
								<div>{customer.phone || "—"}</div>
								<div className="text-muted-foreground">Email</div>
								<div>{customer.email || "—"}</div>
								<div className="text-muted-foreground">Assigned to</div>
								<div>{assignedLabel}</div>
								<div className="text-muted-foreground">Created</div>
								<div>{formatDate(customer.created_at)}</div>
								<div className="text-muted-foreground">Updated</div>
								<div>{formatDate(customer.updated_at)}</div>
							</div>
						</CardContent>
					</Card>

					<div className="stack" style={{ gap: 14 }}>
						<Card>
							<CardHeader>
								<CardTitle>Lead</CardTitle>
								<CardDescription>Track sales stage for this customer.</CardDescription>
							</CardHeader>
							<CardContent>
								{customer.is_lead ? (
									<div className="stack" style={{ gap: 12 }}>
										<div className="rowWrap" style={{ justifyContent: "space-between" }}>
											<div style={{ minWidth: 220 }}>
												<div className="label">Stage</div>
												<select className="flex h-10 w-full rounded-md border border-input bg-white/90 px-3 py-2 text-sm shadow-soft ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60" value={customer.lead_stage || "New"} onChange={(e) => updateLeadStage(e.target.value)} disabled={leadSaving}>
													<option value="New">New</option>
													<option value="Contacted">Contacted</option>
													<option value="Interested">Interested</option>
													<option value="Closed">Closed</option>
												</select>
											</div>
											<Badge>Lead</Badge>
										</div>

										<div className="rowWrap" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
											<div style={{ flex: 1, minWidth: 220 }}>
												<div className="label">Deal value (optional)</div>
												<Input type="number" min="0" step="0.01" value={dealValue} onChange={(e) => setDealValue(e.target.value)} disabled={leadSaving} placeholder="e.g. 50000" />
											</div>
											<Button variant="outline" type="button" onClick={saveDealValue} disabled={leadSaving}>
												<FiSave aria-hidden="true" /> {leadSaving ? "Saving…" : "Save"}
											</Button>
										</div>
									</div>
								) : (
									<div className="rowWrap" style={{ justifyContent: "space-between" }}>
										<div>
											<div style={{ fontWeight: 800 }}>Not a lead yet</div>
											<div className="small subtle">Convert to start tracking stages.</div>
										</div>
										<Button variant="default" type="button" onClick={convertToLead} disabled={leadSaving}>
											<FiTrendingUp aria-hidden="true" /> {leadSaving ? "Working…" : "Convert to lead"}
										</Button>
									</div>
								)}
							</CardContent>
						</Card>

						<TasksSection customerId={customerId} />
						<NotesSection customerId={customerId} />
						<ActivityTimeline customerId={customerId} />
					</div>
				</div>
			) : null}
		</div>
	);
}
