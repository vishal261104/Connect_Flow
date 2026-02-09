import { useEffect, useState } from "react";
import { tasksApi } from "../services/api.js";

import { FiPlus } from "react-icons/fi";

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
	const [tasks, setTasks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [title, setTitle] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setError("");
			try {
				const data = await tasksApi.listByCustomer(customerId);
				if (!cancelled) setTasks(Array.isArray(data) ? data : []);
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
		setError("");
		const t = title.trim();
		if (!t) return setError("Task title is required");

		const dueAt = fromDateInputValue(dueDate);
		if (dueAt === undefined) return setError("Invalid due date");

		setSaving(true);
		try {
			const created = await tasksApi.create(customerId, { title: t, due_at: dueAt });
			setTasks((prev) => [created, ...(prev ?? [])]);
			setTitle("");
			setDueDate("");
		} catch (err) {
			setError(err?.message ?? "Failed to create task");
		} finally {
			setSaving(false);
		}
	};

	const toggle = async (task) => {
		const next = task.status === "Completed" ? "Pending" : "Completed";
		try {
			const updated = await tasksApi.update(customerId, task.id, { status: next });
			setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
		} catch (err) {
			setError(err?.message ?? "Failed to update task");
		}
	};

	return (
		<section className="card">
			<div className="cardPad" style={{ borderBottom: "1px solid var(--border)" }}>
				<div style={{ fontWeight: 900 }}>Follow-ups</div>
				<div className="small subtle" style={{ marginTop: 4 }}>
					Create tasks and mark them completed.
				</div>
			</div>
			<div className="cardPad">
				{error ? <div className="alert" style={{ marginBottom: 12 }}>{error}</div> : null}
				<form className="stack" onSubmit={add} style={{ gap: 10 }}>
					<div>
						<div className="label">Task</div>
						<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call Rahul tomorrow" disabled={saving} />
					</div>
					<div className="grid2">
						<div>
							<div className="label">Due date</div>
							<input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={saving} />
							<div className="small" style={{ marginTop: 6 }}>Optional</div>
						</div>
						<div className="rowWrap" style={{ justifyContent: "flex-end", alignItems: "flex-end" }}>
							<button className="btn btnPrimary" type="submit" disabled={saving}>
								<FiPlus aria-hidden="true" /> {saving ? "Adding…" : "Add task"}
							</button>
						</div>
					</div>
				</form>

				<div style={{ marginTop: 14 }}>
					{loading ? (
						<div className="small subtle">Loading tasks…</div>
					) : tasks?.length ? (
						<div className="stack" style={{ gap: 10 }}>
							{tasks.map((task, idx) => (
								<div key={task.id} className="rowWrap" style={{ justifyContent: "space-between" }}>
									<label className="row" style={{ gap: 10, alignItems: "center" }}>
										<input type="checkbox" checked={task.status === "Completed"} onChange={() => toggle(task)} />
										<div>
											<div style={{ fontWeight: 750, textDecoration: task.status === "Completed" ? "line-through" : "none" }}>
												{task.title}
											</div>
											<div className="small subtle">
												{task.due_at ? `Due: ${toDateInputValue(task.due_at)}` : "No due date"}
											</div>
										</div>
									</label>
									<div className="badge mono" title={`ID: ${task.id}`}>#{idx + 1}</div>
								</div>
							))}
						</div>
					) : (
						<div className="small subtle">No tasks yet.</div>
					)}
				</div>
			</div>
		</section>
	);
}
