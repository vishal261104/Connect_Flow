import { Link } from "react-router-dom";

import { FiEdit2, FiExternalLink, FiPlus } from "react-icons/fi";

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
			<div className="card cardPad">
				<div className="rowWrap" style={{ justifyContent: "space-between" }}>
					<div>
						<div style={{ fontWeight: 700 }}>No customers yet</div>
						<div className="subtle">Create your first customer to get started.</div>
					</div>
					<Link className="btn btnPrimary" to="/customers/new">
						<FiPlus aria-hidden="true" /> Add customer
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="card">
			<div className="tableWrap">
				<table className="table">
					<thead>
						<tr>
							<th className="th">Name</th>
							<th className="th">Company</th>
							<th className="th">Phone</th>
							<th className="th">Email</th>
							<th className="th">Created</th>
							<th className="th" style={{ width: 210 }}>
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{customers.map((c, idx) => (
							<tr className="tr" key={c.id}>
								<td className="td">
									<div style={{ fontWeight: 750 }}>
										<Link to={`/customers/${c.id}`}>{c.name}</Link>
									</div>
									<div className="small mono" title={`ID: ${c.id}`}>#{idx + 1}</div>
								</td>
								<td className="td">{c.company || "—"}</td>
								<td className="td">{c.phone || "—"}</td>
								<td className="td">{c.email || "—"}</td>
								<td className="td">{formatDate(c.created_at)}</td>
								<td className="td">
									<div className="rowWrap">
										<Link className="btn btnPrimary" to={`/customers/${c.id}`}>
											<FiExternalLink aria-hidden="true" /> Open
										</Link>
										<Link className="btn" to={`/customers/${c.id}/edit`}>
											<FiEdit2 aria-hidden="true" /> Edit
										</Link>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
