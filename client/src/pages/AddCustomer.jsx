import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { customersApi } from "../services/api.js";

import { FiPlus, FiX } from "react-icons/fi";

export default function AddCustomer() {
	const navigate = useNavigate();
	const [form, setForm] = useState({ name: "", phone: "", email: "", company: "" });
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

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
			const created = await customersApi.create(payload);
			navigate(`/customers/${created.id}`);
		} catch (err) {
			setError(err?.message ?? "Failed to create customer");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="stack" style={{ gap: 14 }}>
			<div className="pageHeader">
				<div>
					<h1 className="h1">Add customer</h1>
					<p className="subtle">Create a customer record. You can add notes on the profile page.</p>
				</div>
			</div>

			{error ? <div className="alert">{error}</div> : null}

			<div className="card cardPad">
				<form className="stack" onSubmit={submit}>
					<div className="grid2">
						<div>
							<div className="label">Name *</div>
							<input className="input" value={form.name} onChange={set("name")} placeholder="e.g. Asha Patel" />
						</div>
						<div>
							<div className="label">Company</div>
							<input className="input" value={form.company} onChange={set("company")} placeholder="e.g. Orion Labs" />
						</div>
					</div>

					<div className="grid2">
						<div>
							<div className="label">Phone</div>
							<input className="input" value={form.phone} onChange={set("phone")} placeholder="e.g. +91 98xxxxxxx" />
						</div>
						<div>
							<div className="label">Email</div>
							<input className="input" value={form.email} onChange={set("email")} placeholder="e.g. asha@orion.com" />
						</div>
					</div>

					<div className="rowWrap" style={{ justifyContent: "flex-end" }}>
						<button className="btn" type="button" onClick={() => navigate("/customers")} disabled={saving}>
							<FiX aria-hidden="true" /> Cancel
						</button>
						<button className="btn btnPrimary" type="submit" disabled={saving}>
							<FiPlus aria-hidden="true" /> {saving ? "Creating…" : "Create customer"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
