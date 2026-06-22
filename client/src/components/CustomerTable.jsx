import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

import { FiEdit2, FiExternalLink, FiPlus } from "react-icons/fi";

import { Button } from "./ui/button.jsx";
import { Card, CardContent } from "./ui/card.jsx";

const ITEMS_PER_PAGE = 5;

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

export default function CustomerTable({ customers }) {
	const [currentPage, setCurrentPage] = useState(1);

	// Reset to page 1 when the customers list changes (e.g., search query)
	useEffect(() => {
		setCurrentPage(1);
	}, [customers]);

	if (!customers?.length) {
		return (
			<Card>
				<CardContent className="pt-5">
					<div className="rowWrap" style={{ justifyContent: "space-between" }}>
						<div>
							<div style={{ fontWeight: 700 }}>No customers yet</div>
							<div className="subtle">Create your first customer to get started.</div>
						</div>
						<Button asChild variant="default">
							<Link to="/customers/new">
								<FiPlus aria-hidden="true" /> Add customer
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	const totalPages = Math.ceil(customers.length / ITEMS_PER_PAGE);
	const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
	const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
	const paginatedCustomers = customers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	const handlePrev = () => {
		if (validCurrentPage > 1) setCurrentPage(validCurrentPage - 1);
	};

	const handleNext = () => {
		if (validCurrentPage < totalPages) setCurrentPage(validCurrentPage + 1);
	};

	return (
		<Card>
			<CardContent className="pt-5">
				<div className="w-full overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr>
								<th className="whitespace-nowrap border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
									Name
								</th>
								<th className="whitespace-nowrap border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
									Company
								</th>
								<th className="whitespace-nowrap border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
									Phone
								</th>
								<th className="whitespace-nowrap border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
									Email
								</th>
								<th className="whitespace-nowrap border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
									Created
								</th>
								<th
									className="whitespace-nowrap border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground"
									style={{ width: 210 }}
								>
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{paginatedCustomers.map((c, idx) => {
								const globalIndex = startIndex + idx + 1;
								return (
									<tr key={c.id} className="border-b border-border/60 last:border-0">
										<td className="px-4 py-3 align-top">
											<div style={{ fontWeight: 750 }}>
												<Link className="hover:underline underline-offset-4" to={`/customers/${c.id}`}>
													{c.name}
												</Link>
											</div>
											<div className="text-xs text-muted-foreground mono" title={`ID: ${c.id}`}>
												#{globalIndex}
											</div>
										</td>
										<td className="px-4 py-3 align-top">{c.company || "—"}</td>
										<td className="px-4 py-3 align-top">{c.phone || "—"}</td>
										<td className="px-4 py-3 align-top">{c.email || "—"}</td>
										<td className="px-4 py-3 align-top">{formatDate(c.created_at)}</td>
										<td className="px-4 py-3 align-top">
											<div className="rowWrap">
												<Button asChild variant="default" size="sm">
													<Link to={`/customers/${c.id}`}>
														<FiExternalLink aria-hidden="true" /> Open
													</Link>
												</Button>
												<Button asChild variant="outline" size="sm">
													<Link to={`/customers/${c.id}/edit`}>
														<FiEdit2 aria-hidden="true" /> Edit
													</Link>
												</Button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{totalPages > 1 && (
					<div className="flex items-center justify-center mt-6">
						<div className="flex items-center justify-between w-full max-w-80 text-gray-500 font-medium">
							<button 
								type="button" 
								aria-label="prev" 
								className="rounded-full bg-slate-200/50 disabled:opacity-50"
								onClick={handlePrev}
								disabled={validCurrentPage === 1}
							>
								<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"> 
									<path d="M22.499 12.85a.9.9 0 0 1 .57.205l.067.06a.9.9 0 0 1 .06 1.206l-.06.066-5.585 5.586-.028.027.028.027 5.585 5.587a.9.9 0 0 1 .06 1.207l-.06.066a.9.9 0 0 1-1.207.06l-.066-.06-6.25-6.25a1 1 0 0 1-.158-.212l-.038-.08a.9.9 0 0 1-.03-.606l.03-.083a1 1 0 0 1 .137-.226l.06-.066 6.25-6.25a.9.9 0 0 1 .635-.263Z" fill="#475569" stroke="#475569" strokeWidth=".078"/> 
								</svg>
							</button>

							<div className="flex items-center gap-2 text-sm font-medium">
								{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
									<button 
										key={page}
										type="button" 
										onClick={() => setCurrentPage(page)}
										className={`h-10 w-10 flex items-center justify-center aspect-square transition-all ${
											validCurrentPage === page 
												? "text-indigo-500 border border-indigo-200 rounded-full" 
												: "hover:bg-slate-100 rounded-full"
										}`}
									>
										{page}
									</button>
								))}
							</div>

							<button 
								type="button" 
								aria-label="next" 
								className="rounded-full bg-slate-200/50 disabled:opacity-50"
								onClick={handleNext}
								disabled={validCurrentPage === totalPages}
							>
								<svg className="rotate-180" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"> 
									<path d="M22.499 12.85a.9.9 0 0 1 .57.205l.067.06a.9.9 0 0 1 .06 1.206l-.06.066-5.585 5.586-.028.027.028.027 5.585 5.587a.9.9 0 0 1 .06 1.207l-.06.066a.9.9 0 0 1-1.207.06l-.066-.06-6.25-6.25a1 1 0 0 1-.158-.212l-.038-.08a.9.9 0 0 1-.03-.606l.03-.083a1 1 0 0 1 .137-.226l.06-.066 6.25-6.25a.9.9 0 0 1 .635-.263Z" fill="#475569" stroke="#475569" strokeWidth=".078"/> 
								</svg>
							</button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

