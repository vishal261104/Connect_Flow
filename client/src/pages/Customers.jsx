import { useEffect, useMemo, useState } from "react";
import { customersApi } from "../services/api.js";
import CustomerTable from "../components/CustomerTable.jsx";

const SORTS = {
	newest: "newest",
	oldest: "oldest",
	nameAsc: "nameAsc",
	nameDesc: "nameDesc",
};

const safeLower = (value) => String(value ?? "").toLowerCase();

const toTime = (value) => {
	const t = new Date(value ?? 0).getTime();
	return Number.isFinite(t) ? t : 0;
};

export default function Customers() {
	const [customers, setCustomers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState(SORTS.newest);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setError("");
			try {
				const data = await customersApi.list();
				if (!cancelled) setCustomers(Array.isArray(data) ? data : []);
			} catch (e) {
				if (!cancelled) setError(e?.message ?? "Failed to load customers");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	const filteredAndSorted = useMemo(() => {
		const q = query.trim().toLowerCase();
		let result = customers;
		if (q) {
			result = (customers ?? []).filter((c) => {
				return (
					safeLower(c.name).includes(q) ||
					safeLower(c.company).includes(q) ||
					safeLower(c.email).includes(q) ||
					safeLower(c.phone).includes(q) ||
					safeLower(c.id).includes(q)
				);
			});
		}

		const sorted = [...(result ?? [])];
		sorted.sort((a, b) => {
			if (sort === SORTS.oldest) return toTime(a.created_at) - toTime(b.created_at);
			if (sort === SORTS.nameAsc) return safeLower(a.name).localeCompare(safeLower(b.name));
			if (sort === SORTS.nameDesc) return safeLower(b.name).localeCompare(safeLower(a.name));
			// newest default
			return toTime(b.created_at) - toTime(a.created_at);
		});
		return sorted;
	}, [customers, query, sort]);

	return (
		<div className="stack" style={{ gap: 14 }}>
			<div className="pageHeader">
				<div>
					<h1 className="h1">Customers</h1>
					<p className="subtle">Manage your customer list and open profiles for notes.</p>
				</div>
				<div className="rowWrap">
					<div className="badge">{filteredAndSorted.length} shown</div>
					<div className="badge">API: /api/customers</div>
				</div>
			</div>

			<div className="card cardPad">
				<div className="rowWrap" style={{ justifyContent: "space-between" }}>
					<div style={{ flex: 1, minWidth: 240 }}>
						<div className="label">Filter</div>
						<input
							className="input"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search name, company, email, phone, id…"
							disabled={loading}
						/>
						<div className="small" style={{ marginTop: 6 }}>
							Matches: name, company, email, phone, id
						</div>
					</div>

					<div style={{ minWidth: 220 }}>
						<div className="label">Sort</div>
						<select
							className="input"
							value={sort}
							onChange={(e) => setSort(e.target.value)}
							disabled={loading}
						>
							<option value={SORTS.newest}>Created: newest</option>
							<option value={SORTS.oldest}>Created: oldest</option>
							<option value={SORTS.nameAsc}>Name: A → Z</option>
							<option value={SORTS.nameDesc}>Name: Z → A</option>
						</select>
					</div>
				</div>
			</div>

			{error ? <div className="alert">{error}</div> : null}
			{loading ? <div className="card cardPad">Loading customers…</div> : <CustomerTable customers={filteredAndSorted} />}
		</div>
	);
}
