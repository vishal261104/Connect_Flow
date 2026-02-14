import { Link } from "react-router-dom";

import { FiEdit2, FiExternalLink, FiPlus } from "react-icons/fi";

import { Button } from "./ui/button.jsx";
import { Card, CardContent } from "./ui/card.jsx";

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
							{customers.map((c, idx) => (
								<tr key={c.id} className="border-b border-border/60 last:border-0">
									<td className="px-4 py-3 align-top">
										<div style={{ fontWeight: 750 }}>
											<Link className="hover:underline underline-offset-4" to={`/customers/${c.id}`}>
												{c.name}
											</Link>
										</div>
										<div className="text-xs text-muted-foreground mono" title={`ID: ${c.id}`}>
											#{idx + 1}
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
							))}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
	
}

