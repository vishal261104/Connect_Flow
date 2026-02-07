import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { customersApi } from "../services/api.js";

export default function AddCustomer() {
	const navigate = useNavigate();
	const [form, setForm] = useState({ name: "", phone: "", email: "", company: "" });
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [sentTo, setSentTo] = useState("");
	const [verifyUrl, setVerifyUrl] = useState("");

	const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

	const submit = async (e) => {
		e.preventDefault();
		setError("");
		setSentTo("");
		setVerifyUrl("");

		const emailTrimmed = form.email.trim();
		if (!emailTrimmed) {
			setError("Email is required for verification");
			return;
		}

		const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
		if (!emailOk) {
			setError("Please enter a valid email address");
			return;
		}

		const payload = {
			name: form.name.trim(),
			phone: form.phone.trim() || null,
			email: emailTrimmed,
			company: form.company.trim() || null,
		};

		if (!payload.name) {
			setError("Name is required");
			return;
		}

		setSaving(true);
		try {
			const response = await customersApi.create(payload);
			setSentTo(emailTrimmed);
			setVerifyUrl(response?.verifyUrl ?? "");
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
			{sentTo ? (
				<div className="card cardPad">
					<div style={{ fontWeight: 800 }}>Verification email sent</div>
					<div className="subtle" style={{ marginTop: 6 }}>
						We sent a verification link to <span className="mono">{sentTo}</span>. The customer will be added after you click the link.
					</div>
					{verifyUrl ? (
						<div className="card" style={{ borderRadius: 12, marginTop: 12 }}>
							<div className="cardPad" style={{ padding: 12 }}>
								<div className="small">SMTP isn’t configured on the server, so no email was sent. Use this link to verify:</div>
								<div className="mono" style={{ marginTop: 8, wordBreak: "break-all" }}>
									<a href={verifyUrl} target="_blank" rel="noreferrer">
										{verifyUrl}
									</a>
								</div>
							</div>
						</div>
					) : null}
					<div className="rowWrap" style={{ justifyContent: "flex-end", marginTop: 12 }}>
						<button className="btn btnPrimary" type="button" onClick={() => navigate("/customers")}>
							Back to customers
						</button>
					</div>
				</div>
			) : null}

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
							Cancel
						</button>
						<button className="btn btnPrimary" type="submit" disabled={saving}>
							{saving ? "Sending…" : "Send verification"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
