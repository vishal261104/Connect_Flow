import { useEffect, useMemo, useState } from "react";

import { workspacesApi, isApiError } from "../services/api.js";

import { Alert } from "../components/ui/alert.jsx";
import { Button } from "../components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Input } from "../components/ui/input.jsx";

const Select = ({ className, ...props }) => {
	return (
		<select
			className={
				"flex h-10 w-full rounded-md border border-input bg-white/90 px-3 py-2 text-sm shadow-soft ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 " +
				(className ?? "")
			}
			{...props}
		/>
	);
};

export default function Admin() {
	const [workspaces, setWorkspaces] = useState([]);
	const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
	const [workspaceName, setWorkspaceName] = useState("");

	const [users, setUsers] = useState([]);
	const [userName, setUserName] = useState("");
	const [userEmail, setUserEmail] = useState("");
	const [userPassword, setUserPassword] = useState("");
	const [userRole, setUserRole] = useState("Sales");

	const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
	const [loadingUsers, setLoadingUsers] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const selectedWorkspace = useMemo(() => {
		const id = Number(selectedWorkspaceId);
		if (!id) return null;
		return workspaces.find((w) => Number(w.id) === id) ?? null;
	}, [selectedWorkspaceId, workspaces]);

	const loadWorkspaces = async () => {
		setError("");
		setSuccess("");
		setLoadingWorkspaces(true);
		try {
			const data = await workspacesApi.list();
			setWorkspaces(Array.isArray(data) ? data : []);
			if (!selectedWorkspaceId && Array.isArray(data) && data.length) {
				setSelectedWorkspaceId(String(data[0].id));
			}
		} catch (err) {
			setError(isApiError(err) ? err.message : "Failed to load workspaces");
		} finally {
			setLoadingWorkspaces(false);
		}
	};

	const loadUsers = async (workspaceId) => {
		setError("");
		setSuccess("");
		setLoadingUsers(true);
		try {
			const data = await workspacesApi.listUsers(workspaceId);
			setUsers(Array.isArray(data) ? data : []);
		} catch (err) {
			setUsers([]);
			setError(isApiError(err) ? err.message : "Failed to load users");
		} finally {
			setLoadingUsers(false);
		}
	};

	useEffect(() => {
		loadWorkspaces();
	}, []);

	useEffect(() => {
		const id = Number(selectedWorkspaceId);
		if (!id) return;
		loadUsers(id);
	}, [selectedWorkspaceId]);

	const onCreateWorkspace = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		const name = String(workspaceName ?? "").trim();
		if (!name) {
			setError("Workspace name is required");
			return;
		}

		try {
			const created = await workspacesApi.create({ name });
			setWorkspaceName("");
			await loadWorkspaces();
			if (created?.id) setSelectedWorkspaceId(String(created.id));
			setSuccess("Workspace created");
		} catch (err) {
			setError(isApiError(err) ? err.message : "Failed to create workspace");
		}
	};

	const onCreateUser = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess("");

		const workspaceId = Number(selectedWorkspaceId);
		if (!workspaceId) {
			setError("Select a workspace");
			return;
		}

		const payload = {
			name: String(userName ?? "").trim(),
			email: String(userEmail ?? "").trim(),
			password: String(userPassword ?? ""),
			role: String(userRole ?? "").trim(),
		};

		if (!payload.name) return setError("Name is required");
		if (!payload.email) return setError("Email is required");
		if (!payload.password || payload.password.length < 6) return setError("Password must be at least 6 characters");
		if (!payload.role) return setError("Role is required");

		try {
			await workspacesApi.createUser(workspaceId, payload);
			setUserName("");
			setUserEmail("");
			setUserPassword("");
			setUserRole("Sales");
			await loadUsers(workspaceId);
			setSuccess("User created");
		} catch (err) {
			setError(isApiError(err) ? err.message : "Failed to create user");
		}
	};

	return (
		<div className="grid gap-4">
			{error ? <Alert variant="destructive">{error}</Alert> : null}
			{success ? <Alert>{success}</Alert> : null}

			<Card>
				<CardHeader>
					<CardTitle>Workspaces</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3">
					<div className="grid gap-2 sm:grid-cols-[1fr_auto]">
						<Select
							value={selectedWorkspaceId}
							onChange={(e) => setSelectedWorkspaceId(e.target.value)}
							disabled={loadingWorkspaces}
						>
							<option value="">Select a workspace…</option>
							{workspaces.map((w) => (
								<option key={w.id} value={w.id}>
									{w.name}
								</option>
							))}
						</Select>
						<Button type="button" variant="outline" onClick={loadWorkspaces} disabled={loadingWorkspaces}>
							{loadingWorkspaces ? "Refreshing…" : "Refresh"}
						</Button>
					</div>

					<form onSubmit={onCreateWorkspace} className="grid gap-2 sm:grid-cols-[1fr_auto]">
						<Input
							placeholder="New workspace name"
							value={workspaceName}
							onChange={(e) => setWorkspaceName(e.target.value)}
							disabled={loadingWorkspaces}
						/>
						<Button type="submit" variant="default" disabled={loadingWorkspaces}>
							Create workspace
						</Button>
					</form>

					{selectedWorkspace ? (
						<div className="text-sm text-muted-foreground">
							Selected: <span className="font-semibold text-foreground">{selectedWorkspace.name}</span>
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Users (Selected Workspace)</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3">
					<form onSubmit={onCreateUser} className="grid gap-2">
						<div className="grid gap-2 sm:grid-cols-2">
							<Input placeholder="Full name" value={userName} onChange={(e) => setUserName(e.target.value)} />
							<Input placeholder="Email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
						</div>
						<div className="grid gap-2 sm:grid-cols-2">
							<Input
								placeholder="Password (min 6 chars)"
								type="password"
								value={userPassword}
								onChange={(e) => setUserPassword(e.target.value)}
							/>
							<Select value={userRole} onChange={(e) => setUserRole(e.target.value)}>
								<option value="Admin">Admin</option>
								<option value="Sales">Sales</option>
								<option value="Viewer">Viewer</option>
							</Select>
						</div>
						<Button type="submit" variant="default" disabled={!selectedWorkspaceId}>
							Create user
						</Button>
					</form>

					<div className="grid gap-2">
						<div className="flex items-center justify-between">
							<div className="text-sm text-muted-foreground">Users</div>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									const id = Number(selectedWorkspaceId);
									if (id) loadUsers(id);
								}}
								disabled={loadingUsers || !selectedWorkspaceId}
							>
								{loadingUsers ? "Refreshing…" : "Refresh"}
							</Button>
						</div>

						<div className="overflow-auto rounded-md border border-border bg-white/70">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-border">
										<th className="px-3 py-2 text-left font-semibold">Name</th>
										<th className="px-3 py-2 text-left font-semibold">Email</th>
										<th className="px-3 py-2 text-left font-semibold">Role</th>
									</tr>
								</thead>
								<tbody>
									{users.length ? (
										users.map((u) => (
											<tr key={u.id} className="border-b border-border last:border-b-0">
												<td className="px-3 py-2">{u.name ?? "—"}</td>
												<td className="px-3 py-2">{u.email}</td>
												<td className="px-3 py-2">{u.role}</td>
											</tr>
										))
									) : (
										<tr>
											<td className="px-3 py-3 text-muted-foreground" colSpan={3}>
												{selectedWorkspaceId ? "No users yet" : "Select a workspace"}
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
