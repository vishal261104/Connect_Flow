import { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

import { FiLogIn, FiRepeat, FiUserPlus } from "react-icons/fi";

export default function Login() {
	const { user, loading, login, register } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const [mode, setMode] = useState("login");
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
		if (!emailTrimmed) return setError("Email is required");
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) return setError("Please enter a valid email");
		if (!password) return setError("Password is required");

		setSubmitting(true);
		try {
			if (mode === "register") await register({ email: emailTrimmed, password });
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

			{error ? <div className="alert">{error}</div> : null}

			<div className="card cardPad">
				<form className="stack" onSubmit={submit}>
					<div>
						<div className="label">Email</div>
						<input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" disabled={submitting} />
					</div>

					<div>
						<div className="label">Password</div>
						<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} />
						<div className="small" style={{ marginTop: 6 }}>Minimum 6 characters</div>
					</div>

					<div className="rowWrap" style={{ justifyContent: "space-between" }}>
						<button className="btn" type="button" disabled={submitting} onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}>
							<FiRepeat aria-hidden="true" /> {mode === "login" ? "Create account" : "Use existing login"}
						</button>
						<button className="btn btnPrimary" type="submit" disabled={submitting || loading}>
							{mode === "register" ? <FiUserPlus aria-hidden="true" /> : <FiLogIn aria-hidden="true" />} {submitting ? "Please wait…" : mode === "register" ? "Create" : "Login"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
