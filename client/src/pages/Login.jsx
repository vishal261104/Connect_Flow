import { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

import { FiLogIn, FiRepeat, FiUserPlus } from "react-icons/fi";

import { Alert } from "../components/ui/alert.jsx";
import { Button } from "../components/ui/button.jsx";
import { Card, CardContent } from "../components/ui/card.jsx";
import { Input } from "../components/ui/input.jsx";

export default function Login() {
	const { user, loading, login, register } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const [mode, setMode] = useState("login");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");

	const redirectTo = useMemo(() => {
		const from = location.state?.from;
		return typeof from === "string" && from.startsWith("/") ? from : "/dashboard";
	}, [location.state]);

	if (!loading && user) return <Navigate to={redirectTo} replace />;

	const submit = async (e) => {
		e.preventDefault();
		setError("");

		const emailTrimmed = email.trim();
		const nameTrimmed = name.trim();
		if (mode === "register" && !nameTrimmed) return setError("Name is required");
		if (!emailTrimmed) return setError("Email is required");
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) return setError("Please enter a valid email");
		if (!password) return setError("Password is required");

		setSubmitting(true);
		try {
			if (mode === "register") await register({ name: nameTrimmed, email: emailTrimmed, password });
			else await login({ email: emailTrimmed, password });
			navigate(redirectTo, { replace: true });
		} catch (err) {
			setError(err?.message ?? "Login failed");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="stack" style={{ gap: 14, maxWidth: 520, margin: "0 auto" }}>
			<div className="pageHeader">
				<div>
					<h1 className="h1">{mode === "register" ? "Create account" : "Login"}</h1>
					<p className="subtle">Access your customers, leads, and follow-ups.</p>
				</div>
			</div>

			{error ? <Alert>{error}</Alert> : null}

			<Card>
				<CardContent className="pt-5">
				<form className="stack" onSubmit={submit}>
					{mode === "register" ? (
						<div>
							<div className="label">Name</div>
							<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" disabled={submitting} />
						</div>
					) : null}
					<div>
						<div className="label">Email</div>
						<Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" disabled={submitting} />
					</div>

					<div>
						<div className="label">Password</div>
						<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} />
						<div className="small" style={{ marginTop: 6 }}>Minimum 6 characters</div>
					</div>

					<div className="rowWrap" style={{ justifyContent: "space-between" }}>
						<Button variant="outline" type="button" disabled={submitting} onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}>
							<FiRepeat aria-hidden="true" /> {mode === "login" ? "Create account" : "Use existing login"}
						</Button>
						<Button variant="default" type="submit" disabled={submitting || loading}>
							{mode === "register" ? <FiUserPlus aria-hidden="true" /> : <FiLogIn aria-hidden="true" />} {submitting ? "Please wait…" : mode === "register" ? "Create" : "Login"}
						</Button>
					</div>
				</form>
				</CardContent>
			</Card>
		</div>
	);
}
