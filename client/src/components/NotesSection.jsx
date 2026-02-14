import { useEffect, useMemo, useState } from "react";
import { notesApi } from "../services/api.js";

import { FiEdit2, FiPlus, FiSave, FiX } from "react-icons/fi";

import { Alert } from "./ui/alert.jsx";
import { Badge } from "./ui/badge.jsx";
import { Button } from "./ui/button.jsx";
import { Card, CardContent } from "./ui/card.jsx";
import { Textarea } from "./ui/textarea.jsx";

const formatDateTime = (value) => {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
};

export default function NotesSection({ customerId }) {
	const [notes, setNotes] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [body, setBody] = useState("");
	const [saving, setSaving] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [editBody, setEditBody] = useState("");
	const [editSaving, setEditSaving] = useState(false);

	const noteCountLabel = useMemo(() => {
		const count = notes?.length ?? 0;
		return `${count} note${count === 1 ? "" : "s"}`;
	}, [notes]);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setError("");
			try {
				const data = await notesApi.listByCustomer(customerId);
				if (!cancelled) setNotes(Array.isArray(data) ? data : []);
			} catch (e) {
				if (!cancelled) setError(e?.message ?? "Failed to load notes");
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
		const value = body.trim();
		if (!value) return;

		setSaving(true);
		setError("");
		try {
			const created = await notesApi.add(customerId, value);
			setNotes((prev) => [created, ...(prev ?? [])]);
			setBody("");
		} catch (err) {
			setError(err?.message ?? "Failed to add note");
		} finally {
			setSaving(false);
		}
	};

	const startEdit = (note) => {
		setError("");
		setEditingId(note.id);
		setEditBody(note.body ?? "");
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditBody("");
		setEditSaving(false);
	};

	const saveEdit = async (noteId) => {
		const value = editBody.trim();
		if (!value) {
			setError("Note body is required");
			return;
		}

		setEditSaving(true);
		setError("");
		try {
			const updated = await notesApi.update(customerId, noteId, value);
			setNotes((prev) => (prev ?? []).map((n) => (n.id === noteId ? updated : n)));
			cancelEdit();
		} catch (err) {
			setError(err?.message ?? "Failed to update note");
		} finally {
			setEditSaving(false);
		}
	};

	return (
		<Card>
			<CardContent className="pt-5 stack">
				<div className="rowWrap" style={{ justifyContent: "space-between" }}>
					<div>
						<div style={{ fontWeight: 800, fontSize: 16 }}>Notes</div>
						<div className="subtle">{noteCountLabel}</div>
					</div>
					<Badge>Latest first</Badge>
				</div>

				{error ? <Alert>{error}</Alert> : null}

				<form className="stack" onSubmit={add}>
					<div>
						<div className="label">Add a note</div>
						<Textarea
							rows={3}
							value={body}
							onChange={(e) => setBody(e.target.value)}
							placeholder="Write a short note…"
						/>
					</div>
					<div className="rowWrap" style={{ justifyContent: "flex-end" }}>
						<Button variant="default" disabled={saving || !body.trim()} type="submit">
							<FiPlus aria-hidden="true" /> {saving ? "Adding…" : "Add note"}
						</Button>
					</div>
				</form>

				<div className="stack" style={{ gap: 10 }}>
					{loading ? (
						<div className="small">Loading notes…</div>
					) : notes.length === 0 ? (
						<div className="small">No notes yet.</div>
					) : (
						notes.map((n, idx) => (
							<Card key={n.id} className="rounded-xl">
								<CardContent style={{ paddingTop: 12, paddingBottom: 12 }}>
									<div className="rowWrap" style={{ justifyContent: "space-between" }}>
										<div className="text-xs text-muted-foreground mono" title={`ID: ${n.id}`}>#{idx + 1}</div>
										<div className="rowWrap" style={{ gap: 8 }}>
											<div className="small">{formatDateTime(n.created_at)}</div>
											<Button
												variant="outline"
												size="sm"
												type="button"
												disabled={saving || editSaving}
												onClick={() => startEdit(n)}
											>
												<FiEdit2 aria-hidden="true" /> Edit
											</Button>
										</div>
									</div>

									{editingId === n.id ? (
										<div className="stack" style={{ marginTop: 10 }}>
											<Textarea
												rows={3}
												value={editBody}
												onChange={(e) => setEditBody(e.target.value)}
												disabled={editSaving}
											/>
											<div className="rowWrap" style={{ justifyContent: "flex-end" }}>
												<Button variant="outline" type="button" onClick={cancelEdit} disabled={editSaving}>
													<FiX aria-hidden="true" /> Cancel
												</Button>
												<Button
													variant="default"
													type="button"
													disabled={editSaving || !editBody.trim()}
													onClick={() => saveEdit(n.id)}
												>
													<FiSave aria-hidden="true" /> {editSaving ? "Saving…" : "Save"}
												</Button>
											</div>
										</div>
									) : (
										<div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{n.body}</div>
									)}
								</CardContent>
							</Card>
						))
					)
					}
				</div>
			</CardContent>
		</Card>
	);
}
