import { Navigate, Route, Routes, Link, useLocation } from "react-router-dom";

import Customers from "./pages/Customers.jsx";
import AddCustomer from "./pages/AddCustomer.jsx";
import EditCustomer from "./pages/EditCustomer.jsx";
import CustomerProfile from "./pages/CustomerProfile.jsx";

const Topbar = () => {
  const location = useLocation();
  const isOnCustomers = location.pathname === "/customers";

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
            <div className="brandSub">Customers & notes</div>
          </div>
        </div>

        <nav className="navLinks">
          <Link className={`btn ${isOnCustomers ? "btnPrimary" : ""}`} to="/customers">
            Customers
          </Link>
          <Link className="btn" to="/customers/new">
            Add customer
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default function App() {
  return (
    <div className="appShell">
      <Topbar />
      <main className="main">
        <div className="container">
          <Routes>
            <Route path="/" element={<Navigate to="/customers" replace />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/new" element={<AddCustomer />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            <Route path="/customers/:id/edit" element={<EditCustomer />} />
            <Route path="*" element={<Navigate to="/customers" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
