import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { customersApi, usersApi } from "../services/api.js";

import { FiPlus, FiX } from "react-icons/fi";

import { Alert } from "../components/ui/alert.jsx";
import { Button } from "../components/ui/button.jsx";
import { Card, CardContent } from "../components/ui/card.jsx";
import { Input } from "../components/ui/input.jsx";

export default function AddCustomer() {
	const navigate = useNavigate();
	const [form, setForm] = useState({ name: "", phone: "", email: "", company: "" });
	const [users, setUsers] = useState([]);
	const [assignedUserId, setAssignedUserId] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

	useEffect(() => {
		let cancelled = false;
		const loadUsers = async () => {
			try {
				const list = await usersApi.list();
				if (!cancelled) setUsers(Array.isArray(list) ? list : []);
			} catch {
				// If user listing fails, keep form usable.
			}
		};
		loadUsers();
		return () => {
			cancelled = true;
		};
	}, []);

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
			assigned_user_id: assignedUserId ? Number(assignedUserId) : null,
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

			{error ? <Alert>{error}</Alert> : null}

			<Card>
				<CardContent className="pt-5">
				<form className="stack" onSubmit={submit}>
					<div className="grid2">
						<div>
							<div className="label">Name *</div>
							<Input value={form.name} onChange={set("name")} placeholder="e.g. Asha Patel" />
						</div>
						<div>
							<div className="label">Company</div>
							<Input value={form.company} onChange={set("company")} placeholder="e.g. Orion Labs" />
						</div>
					</div>

					<div className="grid2">
						<div>
							<div className="label">Phone</div>
							<Input value={form.phone} onChange={set("phone")} placeholder="e.g. +91 98xxxxxxx" />
						</div>
						<div>
							<div className="label">Email</div>
							<Input value={form.email} onChange={set("email")} placeholder="e.g. asha@orion.com" />
						</div>
					</div>

					<div>
						<div className="label">Assigned to</div>
						<select
							className="flex h-10 w-full rounded-md border border-input bg-white/90 px-3 py-2 text-sm shadow-soft ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
							value={assignedUserId}
							onChange={(e) => setAssignedUserId(e.target.value)}
							disabled={saving}
						>
							<option value="">Unassigned</option>
							{users.map((u) => (
								<option key={u.id} value={String(u.id)}>
									{u.email} ({u.role})
								</option>
							))}
						</select>
						<div className="small" style={{ marginTop: 6 }}>
							Optional
						</div>
					</div>

					<div className="rowWrap" style={{ justifyContent: "flex-end" }}>
						<Button variant="outline" type="button" onClick={() => navigate("/customers")} disabled={saving}>
							<FiX aria-hidden="true" /> Cancel
						</Button>
						<Button variant="default" type="submit" disabled={saving}>
							<FiPlus aria-hidden="true" /> {saving ? "Creating…" : "Create customer"}
						</Button>
					</div>
				</form>
				</CardContent>
			</Card>
		</div>
	);
}
