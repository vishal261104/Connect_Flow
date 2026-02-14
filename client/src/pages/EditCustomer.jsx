import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { customersApi, usersApi } from "../services/api.js";

import { FiArrowLeft, FiSave, FiTrash2 } from "react-icons/fi";

import { Alert } from "../components/ui/alert.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";
import { Card, CardContent } from "../components/ui/card.jsx";
import { Input } from "../components/ui/input.jsx";

export default function EditCustomer() {
	const { id } = useParams();
	const customerId = Number(id);
	const navigate = useNavigate();

	const [form, setForm] = useState({ name: "", phone: "", email: "", company: "" });
	const [users, setUsers] = useState([]);
	const [assignedUserId, setAssignedUserId] = useState("");
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
				const [customer, usersList] = await Promise.all([
					customersApi.get(customerId),
					usersApi.list().catch(() => []),
				]);
				if (cancelled) return;
				setUsers(Array.isArray(usersList) ? usersList : []);
				setForm({
					name: customer?.name ?? "",
					phone: customer?.phone ?? "",
					email: customer?.email ?? "",
					company: customer?.company ?? "",
				});
				setAssignedUserId(customer?.assigned_user_id != null ? String(customer.assigned_user_id) : "");
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
			assigned_user_id: assignedUserId ? Number(assignedUserId) : null,
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
				<Badge className="mono">#{customerId || "—"}</Badge>
			</div>

			{error ? <Alert>{error}</Alert> : null}

			{loading ? (
				<Card>
					<CardContent className="pt-5">Loading…</CardContent>
				</Card>
			) : (
				<Card>
					<CardContent className="pt-5">
					<form className="stack" onSubmit={submit}>
						<div className="grid2">
							<div>
								<div className="label">Name *</div>
									<Input value={form.name} onChange={set("name")} />
							</div>
							<div>
								<div className="label">Company</div>
									<Input value={form.company} onChange={set("company")} />
							</div>
						</div>

						<div className="grid2">
							<div>
								<div className="label">Phone</div>
									<Input value={form.phone} onChange={set("phone")} />
							</div>
							<div>
								<div className="label">Email</div>
									<Input value={form.email} onChange={set("email")} />
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

						<div className="rowWrap" style={{ justifyContent: "space-between" }}>
								<Button variant="destructive" type="button" onClick={remove} disabled={deleting || saving}>
								<FiTrash2 aria-hidden="true" /> {deleting ? "Deleting…" : "Delete"}
								</Button>
							<div className="rowWrap">
									<Button variant="outline" type="button" onClick={() => navigate(`/customers/${customerId}`)} disabled={saving}>
									<FiArrowLeft aria-hidden="true" /> Back
									</Button>
									<Button variant="default" type="submit" disabled={saving}>
									<FiSave aria-hidden="true" /> {saving ? "Saving…" : "Save changes"}
									</Button>
							</div>
						</div>
					</form>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
