import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";

import { Alert } from "../components/ui/alert.jsx";
import { Button } from "../components/ui/button.jsx";
import { Card, CardContent } from "../components/ui/card.jsx";
import { Input } from "../components/ui/input.jsx";

import { authApi } from "../services/api.js";

export default function Profile() {
	const { user, updateProfile } = useAuth();
	const [editing, setEditing] = useState(false);
	const [nameDraft, setNameDraft] = useState("");
	const [profileSubmitting, setProfileSubmitting] = useState(false);
	const [profileError, setProfileError] = useState("");
	const [profileSuccess, setProfileSuccess] = useState("");

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const title = useMemo(() => {
		const name = String(user?.name ?? "").trim();
		return name ? name : "Profile";
	}, [user?.name]);

	const submit = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess("");

		if (!currentPassword) return setError("Current password is required");
		if (!newPassword || newPassword.length < 6) return setError("New password must be at least 6 characters");
		if (newPassword !== confirmPassword) return setError("Passwords do not match");

		setSubmitting(true);
		try {
			await authApi.changePassword({ currentPassword, newPassword });
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			setSuccess("Password updated successfully");
		} catch (err) {
			setError(err?.message ?? "Failed to change password");
		} finally {
			setSubmitting(false);
		}
	};

	const startEdit = () => {
		setProfileError("");
		setProfileSuccess("");
		setNameDraft(String(user?.name ?? "").trim());
		setEditing(true);
	};

	const cancelEdit = () => {
		setEditing(false);
		setProfileError("");
		setProfileSuccess("");
		setNameDraft("");
	};

	const saveProfile = async () => {
		setProfileError("");
		setProfileSuccess("");
		const nameTrimmed = String(nameDraft ?? "").trim();
		if (!nameTrimmed) return setProfileError("Name is required");

		setProfileSubmitting(true);
		try {
			await updateProfile({ name: nameTrimmed });
			setEditing(false);
			setProfileSuccess("Profile updated");
		} catch (err) {
			setProfileError(err?.message ?? "Failed to update profile");
		} finally {
			setProfileSubmitting(false);
		}
	};

	return (
		<div className="stack" style={{ gap: 14, maxWidth: 720 }}>
			<div className="pageHeader">
				<div>
					<h1 className="h1">{title}</h1>
					<p className="subtle">Account details and password.</p>
				</div>
			</div>

			<Card>
				<CardContent className="pt-5">
					{profileError ? <Alert>{profileError}</Alert> : null}
					{profileSuccess ? <Alert>{profileSuccess}</Alert> : null}
					<div className="stack" style={{ gap: 10 }}>
						<div className="rowWrap" style={{ justifyContent: "space-between", gap: 10 }}>
							<div className="small subtle">Name</div>
							{editing ? (
								<div className="rowWrap" style={{ gap: 10 }}>
									<Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} disabled={profileSubmitting} />
									<Button type="button" variant="default" onClick={saveProfile} disabled={profileSubmitting}>
										{profileSubmitting ? "Saving…" : "Save"}
									</Button>
									<Button type="button" variant="outline" onClick={cancelEdit} disabled={profileSubmitting}>
										Cancel
									</Button>
								</div>
							) : (
								<div className="rowWrap" style={{ gap: 10 }}>
									<div style={{ fontWeight: 700 }}>{String(user?.name ?? "").trim() || "—"}</div>
									<Button type="button" variant="outline" onClick={startEdit}>
										Edit
									</Button>
								</div>
							)}
						</div>
						<div className="rowWrap" style={{ justifyContent: "space-between", gap: 10 }}>
							<div className="small subtle">Email</div>
							<div style={{ fontWeight: 700 }}>{user?.email ?? "—"}</div>
						</div>
						<div className="rowWrap" style={{ justifyContent: "space-between", gap: 10 }}>
							<div className="small subtle">Role</div>
							<div style={{ fontWeight: 700 }}>{user?.role ?? "—"}</div>
						</div>
						<div className="rowWrap" style={{ justifyContent: "space-between", gap: 10 }}>
							<div className="small subtle">Workspace</div>
							<div style={{ fontWeight: 700 }}>{user?.workspaceId ?? "—"}</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-5">
					<h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Change password</h2>
					{error ? <Alert>{error}</Alert> : null}
					{success ? <Alert>{success}</Alert> : null}
					<form className="stack" onSubmit={submit}>
						<div>
							<div className="label">Current password</div>
							<Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={submitting} />
						</div>
						<div>
							<div className="label">New password</div>
							<Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={submitting} />
							<div className="small" style={{ marginTop: 6 }}>Minimum 6 characters</div>
						</div>
						<div>
							<div className="label">Confirm new password</div>
							<Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={submitting} />
						</div>
						<div className="rowWrap" style={{ justifyContent: "flex-end" }}>
							<Button variant="default" type="submit" disabled={submitting}>
								{submitting ? "Updating…" : "Update password"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
