import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { customersApi } from "../services/api.js";
import NotesSection from "../components/NotesSection.jsx";

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
				if (!cancelled) setCustomer(data);
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

	return (
		<div className="stack" style={{ gap: 14 }}>
			<div className="pageHeader">
				<div>
					<h1 className="h1">{customer?.name ?? "Customer"}</h1>
					<p className="subtle">{headerSubtitle}</p>
				</div>
				<div className="rowWrap">
					<Link className="btn" to="/customers">
						All customers
					</Link>
					<Link className="btn" to={`/customers/${customerId}/edit`}>
						Edit
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
						<button className="btn" onClick={() => navigate("/customers")}>Back</button>
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

					<NotesSection customerId={customerId} />
				</div>
			) : null}
		</div>
	);
}
