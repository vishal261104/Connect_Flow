import { useEffect, useState } from "react";
import { tasksApi, usersApi } from "../services/api.js";
import { useAuth } from "../auth/AuthContext.jsx";

import { FiPlus } from "react-icons/fi";

import { Alert } from "./ui/alert.jsx";
import { Badge } from "./ui/badge.jsx";
import { Button } from "./ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card.jsx";
import { Input } from "./ui/input.jsx";

const toDateInputValue = (iso) => {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
};

const fromDateInputValue = (value) => {
	if (!value) return null;
	// Interpret as local date, end users expect "today" locally.
	const d = new Date(`${value}T09:00:00`);
	if (Number.isNaN(d.getTime())) return undefined;
	return d.toISOString();
};

export default function TasksSection({ customerId }) {
	const { user } = useAuth();
	const role = String(user?.role ?? "");
	const canWrite = role !== "Viewer";

	const [tasks, setTasks] = useState([]);
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [title, setTitle] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [assignedUserId, setAssignedUserId] = useState("");
	const [statusFilter, setStatusFilter] = useState("All");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setError("");
			try {
				const [data, usersList] = await Promise.all([
					tasksApi.listByCustomer(customerId),
					usersApi.list().catch(() => []),
				]);
				if (!cancelled) {
					setTasks(Array.isArray(data) ? data : []);
					setUsers(Array.isArray(usersList) ? usersList : []);
				}
			} catch (err) {
				if (!cancelled) setError(err?.message ?? "Failed to load tasks");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [customerId]);

	const add = async (e) => {
		e.preventDefault();
		if (!canWrite) return;
		setError("");
		const t = title.trim();
		if (!t) return setError("Task title is required");

		const dueAt = fromDateInputValue(dueDate);
		if (dueAt === undefined) return setError("Invalid due date");

		setSaving(true);
		try {
			const created = await tasksApi.create(customerId, {
				title: t,
				due_at: dueAt,
				assigned_user_id: assignedUserId ? Number(assignedUserId) : undefined,
			});
			setTasks((prev) => [created, ...(prev ?? [])]);
			setTitle("");
			setDueDate("");
			setAssignedUserId("");
		} catch (err) {
			setError(err?.message ?? "Failed to create task");
		} finally {
			setSaving(false);
		}
	};

	const labelForUserId = (id) => {
		const numeric = id != null ? Number(id) : null;
		if (!numeric) return "—";
		const match = (users ?? []).find((u) => Number(u.id) === numeric);
		return match?.email ? match.email : `User #${numeric}`;
	};

	const filteredTasks = (tasks ?? []).filter((t) => statusFilter === "All" || t.status === statusFilter);

	const toggle = async (task) => {
		if (!canWrite) return;
		const next = task.status === "Completed" ? "Pending" : "Completed";
		try {
			const updated = await tasksApi.update(customerId, task.id, { status: next });
			setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
		} catch (err) {
			setError(err?.message ?? "Failed to update task");
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Follow-ups</CardTitle>
				<CardDescription>Create tasks and mark them completed.</CardDescription>
			</CardHeader>
			<CardContent>
				{error ? <Alert className="mb-3">{error}</Alert> : null}
				<form className="stack" onSubmit={add} style={{ gap: 10 }}>
					<div>
						<div className="label">Task</div>
						<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call Rahul tomorrow" disabled={saving || !canWrite} />
					</div>
					<div>
						<div className="label">Assign to</div>
						<select
							className="flex h-10 w-full rounded-md border border-input bg-white/90 px-3 py-2 text-sm shadow-soft ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
							value={assignedUserId}
							onChange={(e) => setAssignedUserId(e.target.value)}
							disabled={saving || !canWrite}
						>
							<option value="">Me (default)</option>
							{users.map((u) => (
								<option key={u.id} value={String(u.id)}>
									{u.email} ({u.role})
								</option>
							))}
						</select>
						<div className="small" style={{ marginTop: 6 }}>Optional</div>
					</div>
					<div className="grid2">
						<div>
							<div className="label">Due date</div>
							<Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={saving || !canWrite} />
							<div className="small" style={{ marginTop: 6 }}>Optional</div>
						</div>
						<div className="rowWrap" style={{ justifyContent: "flex-end", alignItems: "flex-end" }}>
							<Button variant="default" type="submit" disabled={saving || !canWrite}>
								<FiPlus aria-hidden="true" /> {saving ? "Adding…" : "Add task"}
							</Button>
						</div>
					</div>
				</form>
				{canWrite ? null : (
					<div className="small subtle" style={{ marginTop: 10 }}>
						Viewer role is read-only.
					</div>
				)}

				<div style={{ marginTop: 14 }} className="rowWrap">
					<div style={{ minWidth: 200 }}>
						<div className="label">Status</div>
						<select
							className="flex h-10 w-full rounded-md border border-input bg-white/90 px-3 py-2 text-sm shadow-soft ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							disabled={loading}
						>
							<option value="All">All</option>
							<option value="Pending">Pending</option>
							<option value="Completed">Completed</option>
						</select>
					</div>
				</div>

				<div style={{ marginTop: 14 }}>
					{loading ? (
						<div className="small subtle">Loading tasks…</div>
					) : filteredTasks.length ? (
						<div className="stack" style={{ gap: 10 }}>
							{filteredTasks.map((task, idx) => (
								<div key={task.id} className="rowWrap" style={{ justifyContent: "space-between" }}>
									<label className="row" style={{ gap: 10, alignItems: "center" }}>
										<input className="h-4 w-4 accent-primary" type="checkbox" checked={task.status === "Completed"} onChange={() => toggle(task)} />
										<div>
											<div style={{ fontWeight: 750, textDecoration: task.status === "Completed" ? "line-through" : "none" }}>
												{task.title}
											</div>
											<div className="small subtle">
												{task.due_at ? `Due: ${toDateInputValue(task.due_at)}` : "No due date"} • Assigned: {labelForUserId(task.assigned_user_id)}
											</div>
										</div>
									</label>
									<Badge className="mono" title={`ID: ${task.id}`}>#{idx + 1}</Badge>
								</div>
								))}
						</div>
					) : (
						<div className="small subtle">{tasks?.length ? "No tasks match this filter." : "No tasks yet."}</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
