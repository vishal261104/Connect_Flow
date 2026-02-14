import { Navigate, Route, Routes, Link, useLocation } from "react-router-dom";

import { useAuth } from "./auth/AuthContext.jsx";

import Customers from "./pages/Customers.jsx";
import AddCustomer from "./pages/AddCustomer.jsx";
import EditCustomer from "./pages/EditCustomer.jsx";
import CustomerProfile from "./pages/CustomerProfile.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Pipeline from "./pages/Pipeline.jsx";
import Profile from "./pages/Profile.jsx";
import NotificationsBell from "./components/NotificationsBell.jsx";

import {
  FiColumns,
  FiHome,
  FiLogIn,
  FiLogOut,
  FiPlus,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import { Button } from "./components/ui/button.jsx";
import { Card, CardContent } from "./components/ui/card.jsx";

const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <Card>
        <CardContent className="pt-5">Loading…</CardContent>
      </Card>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
};

const Topbar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const role = String(user?.role ?? "");
  const isOnCustomers = location.pathname === "/customers";
  const isOnDashboard = location.pathname === "/dashboard";
  const isOnPipeline = location.pathname === "/pipeline";
    const isOnProfile = location.pathname === "/profile";

  return (
    <header className="topbar">
      <div className="container topbarInner">
        <div className="row" style={{ gap: 12 }}>
          <img
            src="/favicon.png"
            alt="CONNECTFLOW"
            width={34}
            height={34}
            style={{ borderRadius: 10, border: "1px solid var(--border)", background: "rgba(255,255,255,.05)" }}
          />
          <div className="brand">
            <div className="brandTitle">CONNECTFLOW</div>
          </div>
        </div>

        <nav className="navLinks">
      {user ? (
        <>
          <Button asChild variant={isOnDashboard ? "default" : "outline"}>
            <Link to="/dashboard">
			  <FiHome aria-hidden="true" /> Dashboard
            </Link>
          </Button>
          <Button asChild variant={isOnCustomers ? "default" : "outline"}>
            <Link to="/customers">
			  <FiUsers aria-hidden="true" /> Customers
            </Link>
          </Button>
          <Button asChild variant={isOnPipeline ? "default" : "outline"}>
            <Link to="/pipeline">
			  <FiColumns aria-hidden="true" /> Pipeline
            </Link>
          </Button>
      {role !== "Viewer" ? (
      <Button asChild variant="outline">
        <Link to="/customers/new">
          <FiPlus aria-hidden="true" /> Add customer
        </Link>
      </Button>
      ) : null}
      <Button asChild variant={isOnProfile ? "default" : "outline"}>
      <Link to="/profile">
        <FiUser aria-hidden="true" /> Profile
      </Link>
      </Button>
		  <NotificationsBell />
          <Button variant="outline" type="button" onClick={logout}>
			<FiLogOut aria-hidden="true" /> Logout
          </Button>
        </>
      ) : (
        <Button asChild variant="default">
          <Link to="/login">
			  <FiLogIn aria-hidden="true" /> Login
          </Link>
        </Button>
      )}
        </nav>
      </div>
    </header>
  );
};

export default function App() {
  const { user } = useAuth();
  return (
    <div className="appShell">
      <Topbar />
      <main className="main">
        <div className="container">
          <Routes>
			<Route path="/login" element={<Login />} />
			<Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
			<Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
			<Route path="/pipeline" element={<RequireAuth><Pipeline /></RequireAuth>} />
			<Route path="/customers" element={<RequireAuth><Customers /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
			<Route path="/customers/new" element={<RequireAuth><AddCustomer /></RequireAuth>} />
			<Route path="/customers/:id" element={<RequireAuth><CustomerProfile /></RequireAuth>} />
			<Route path="/customers/:id/edit" element={<RequireAuth><EditCustomer /></RequireAuth>} />
			<Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
