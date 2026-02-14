import { useEffect, useMemo, useState } from "react";
import { customersApi } from "../services/api.js";
import CustomerTable from "../components/CustomerTable.jsx";

import { Alert } from "../components/ui/alert.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Card, CardContent } from "../components/ui/card.jsx";
import { Input } from "../components/ui/input.jsx";

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

const fromLocalDate = (value, { endOfDay } = {}) => {
	if (!value) return undefined;
	const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
	const d = new Date(`${value}${suffix}`);
	if (Number.isNaN(d.getTime())) return undefined;
	return d.toISOString();
};

export default function Customers() {
	const [customers, setCustomers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [fetching, setFetching] = useState(false);
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [error, setError] = useState("");
	const [query, setQuery] = useState("");
	const [createdFrom, setCreatedFrom] = useState("");
	const [createdTo, setCreatedTo] = useState("");
	const [minDealValue, setMinDealValue] = useState("");
	const [maxDealValue, setMaxDealValue] = useState("");
	const [sort, setSort] = useState(SORTS.newest);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			if (hasLoadedOnce) setFetching(true);
			else setLoading(true);
			setError("");
			try {
				const minDeal = minDealValue.trim() === "" ? undefined : Number(minDealValue);
				const maxDeal = maxDealValue.trim() === "" ? undefined : Number(maxDealValue);
				if (minDealValue.trim() !== "" && (!Number.isFinite(minDeal) || minDeal < 0)) {
					throw new Error("Min deal value must be a valid number");
				}
				if (maxDealValue.trim() !== "" && (!Number.isFinite(maxDeal) || maxDeal < 0)) {
					throw new Error("Max deal value must be a valid number");
				}

				const createdFromIso = fromLocalDate(createdFrom);
				const createdToIso = fromLocalDate(createdTo, { endOfDay: true });
				if (createdFrom && !createdFromIso) throw new Error("Invalid Created from date");
				if (createdTo && !createdToIso) throw new Error("Invalid Created to date");

				const data = await customersApi.list({
					q: query.trim() || undefined,
					min_deal_value: Number.isFinite(minDeal) ? minDeal : undefined,
					max_deal_value: Number.isFinite(maxDeal) ? maxDeal : undefined,
					created_from: createdFromIso,
					created_to: createdToIso,
				});
				if (!cancelled) {
					setCustomers(Array.isArray(data) ? data : []);
					setHasLoadedOnce(true);
				}
			} catch (e) {
				if (!cancelled) setError(e?.message ?? "Failed to load customers");
			} finally {
				if (!cancelled) {
					setLoading(false);
					setFetching(false);
				}
			}
		};

		const handle = setTimeout(load, 250);
		return () => {
			clearTimeout(handle);
			cancelled = true;
		};
	}, [query, createdFrom, createdTo, minDealValue, maxDealValue, hasLoadedOnce]);

	const filteredAndSorted = useMemo(() => {
		const sorted = [...(customers ?? [])];
		sorted.sort((a, b) => {
			if (sort === SORTS.oldest) return toTime(a.created_at) - toTime(b.created_at);
			if (sort === SORTS.nameAsc) return safeLower(a.name).localeCompare(safeLower(b.name));
			if (sort === SORTS.nameDesc) return safeLower(b.name).localeCompare(safeLower(a.name));
			// newest default
			return toTime(b.created_at) - toTime(a.created_at);
		});
		return sorted;
	}, [customers, sort]);

	return (
		<div className="stack" style={{ gap: 14 }}>
			<div className="pageHeader">
				<div>
					<h1 className="h1">Customers</h1>
					<p className="subtle">Manage your customer list and open profiles for notes.</p>
				</div>
				<div className="rowWrap">
					<Badge>{filteredAndSorted.length} shown</Badge>
					
				</div>
			</div>

			<Card>
				<CardContent className="pt-5">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
						<div className="xl:col-span-2">
							<div className="label">Filter</div>
							<Input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search name, company, email, phone…"
								disabled={false}
							/>
						</div>

						<div>
							<div className="label">Created from</div>
							<Input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} disabled={false} />
						</div>
						<div>
							<div className="label">Created to</div>
							<Input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} disabled={false} />
						</div>

						<div>
							<div className="label">Min deal value</div>
							<Input type="number" min="0" step="0.01" value={minDealValue} onChange={(e) => setMinDealValue(e.target.value)} disabled={false} />
						</div>
						<div>
							<div className="label">Max deal value</div>
							<Input type="number" min="0" step="0.01" value={maxDealValue} onChange={(e) => setMaxDealValue(e.target.value)} disabled={false} />
						</div>
						<div>
							<div className="label">Sort</div>
							<select
								className="flex h-10 w-full rounded-md border border-input bg-white/90 px-3 py-2 text-sm shadow-soft ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
								value={sort}
								onChange={(e) => setSort(e.target.value)}
								disabled={false}
							>
								<option value={SORTS.newest}>Created: newest</option>
								<option value={SORTS.oldest}>Created: oldest</option>
								<option value={SORTS.nameAsc}>Name: A → Z</option>
								<option value={SORTS.nameDesc}>Name: Z → A</option>
							</select>
						</div>
					</div>
				</CardContent>
			</Card>

			{error ? <Alert>{error}</Alert> : null}
			{loading && !hasLoadedOnce ? (
				<Card>
					<CardContent className="pt-5">Loading customers…</CardContent>
				</Card>
			) : (
				<CustomerTable customers={filteredAndSorted} />
			)}
		</div>
	);
}
