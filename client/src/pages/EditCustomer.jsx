import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { customersApi } from "../services/api.js";

import { FiArrowLeft, FiSave, FiTrash2 } from "react-icons/fi";

export default function EditCustomer() {
	const { id } = useParams();
	const customerId = Number(id);
	const navigate = useNavigate();

	const [form, setForm] = useState({ name: "", phone: "", email: "", company: "" });
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState("");

	const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setError("");
			try {
				const customer = await customersApi.get(customerId);
				if (cancelled) return;
				setForm({
					name: customer?.name ?? "",
					phone: customer?.phone ?? "",
					email: customer?.email ?? "",
					company: customer?.company ?? "",
				});
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

	const submit = async (e) => {
		e.preventDefault();
		setError("");

		const emailTrimmed = form.email.trim();
		if (emailTrimmed) {
			const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
			if (!emailOk) {
				setError("Please enter a valid email address");
				return;
			}
		}

		const payload = {
			name: form.name.trim(),
			phone: form.phone.trim() || null,
			email: emailTrimmed || null,
			company: form.company.trim() || null,
		};

		if (!payload.name) {
			setError("Name is required");
			return;
		}

		setSaving(true);
		try {
			const updated = await customersApi.update(customerId, payload);
			navigate(`/customers/${updated.id}`);
		} catch (err) {
			setError(err?.message ?? "Failed to update customer");
		} finally {
			setSaving(false);
		}
	};

	const remove = async () => {
		if (deleting) return;
		const ok = window.confirm("Delete this customer? This will also delete their notes.");
		if (!ok) return;

		setDeleting(true);
		setError("");
		try {
			await customersApi.remove(customerId);
			navigate("/customers");
		} catch (err) {
			setError(err?.message ?? "Failed to delete customer");
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div className="stack" style={{ gap: 14 }}>
			<div className="pageHeader">
				<div>
					<h1 className="h1">Edit customer</h1>
					<p className="subtle">Update details and keep your records tidy.</p>
				</div>
				<div className="badge mono">#{customerId || "—"}</div>
			</div>

			{error ? <div className="alert">{error}</div> : null}

			{loading ? (
				<div className="card cardPad">Loading…</div>
			) : (
				<div className="card cardPad">
					<form className="stack" onSubmit={submit}>
						<div className="grid2">
							<div>
								<div className="label">Name *</div>
								<input className="input" value={form.name} onChange={set("name")} />
							</div>
							<div>
								<div className="label">Company</div>
								<input className="input" value={form.company} onChange={set("company")} />
							</div>
						</div>

						<div className="grid2">
							<div>
								<div className="label">Phone</div>
								<input className="input" value={form.phone} onChange={set("phone")} />
							</div>
							<div>
								<div className="label">Email</div>
								<input className="input" value={form.email} onChange={set("email")} />
							</div>
						</div>

						<div className="rowWrap" style={{ justifyContent: "space-between" }}>
							<button className="btn btnDanger" type="button" onClick={remove} disabled={deleting || saving}>
								<FiTrash2 aria-hidden="true" /> {deleting ? "Deleting…" : "Delete"}
							</button>
							<div className="rowWrap">
								<button className="btn" type="button" onClick={() => navigate(`/customers/${customerId}`)} disabled={saving}>
									<FiArrowLeft aria-hidden="true" /> Back
								</button>
								<button className="btn btnPrimary" type="submit" disabled={saving}>
									<FiSave aria-hidden="true" /> {saving ? "Saving…" : "Save changes"}
								</button>
							</div>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
