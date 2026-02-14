const normalizeRole = (value) => String(value ?? "").trim();

export const ROLES = {
	Admin: "Admin",
	Sales: "Sales",
	Viewer: "Viewer",
};

export const requireAnyRole = (roles) => {
	const allowed = new Set((roles ?? []).map(normalizeRole));
	return (req, res, next) => {
		const role = normalizeRole(req.user?.role);
		if (!role) return res.status(401).json({ message: "Unauthorized" });
		if (!allowed.has(role)) return res.status(403).json({ message: "Forbidden" });
		return next();
	};
};

export const requireRole = (role) => requireAnyRole([role]);

export const canWrite = requireAnyRole([ROLES.Admin, ROLES.Sales]);
export const adminOnly = requireRole(ROLES.Admin);
