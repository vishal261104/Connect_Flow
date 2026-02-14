const API_BASE = "/api";

const TOKEN_KEY = "cf_token";

export const authToken = {
	get: () => {
		try {
			return localStorage.getItem(TOKEN_KEY) || "";
		} catch {
			return "";
		}
	},
	set: (token) => {
		try {
			if (!token) localStorage.removeItem(TOKEN_KEY);
			else localStorage.setItem(TOKEN_KEY, String(token));
		} catch {
			// ignore
		}
	},
	clear: () => {
		try {
			localStorage.removeItem(TOKEN_KEY);
		} catch {
			// ignore
		}
	},
};

class ApiError extends Error {
	constructor(message, { status, details } = {}) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.details = details;
	}
}

const request = async (path, { method = "GET", body } = {}) => {
	const token = authToken.get();
	const headers = (() => {
		const headers = {};
		if (body) headers["Content-Type"] = "application/json";
		if (token) headers.Authorization = `Bearer ${token}`;
		return Object.keys(headers).length ? headers : undefined;
	})();

	const response = await fetch(`${API_BASE}${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	if (response.status === 204) return null;

	let data = null;
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		data = await response.json();
	} else {
		data = await response.text();
	}

	if (!response.ok) {
		const message =
			(typeof data === "object" && data && "message" in data && data.message) ||
			`Request failed (${response.status})`;
		throw new ApiError(message, { status: response.status, details: data });
	}

	return data;
};

export const customersApi = {
	list: async ({ q, is_lead, lead_stage, min_deal_value, max_deal_value, created_from, created_to } = {}) => {
		const params = new URLSearchParams();
		if (q) params.set("q", String(q));
		if (is_lead != null) params.set("is_lead", String(Boolean(is_lead)));
		if (lead_stage) params.set("lead_stage", String(lead_stage));
		if (min_deal_value != null) params.set("min_deal_value", String(min_deal_value));
		if (max_deal_value != null) params.set("max_deal_value", String(max_deal_value));
		if (created_from) params.set("created_from", String(created_from));
		if (created_to) params.set("created_to", String(created_to));
		const qs = params.toString();
		return request(`/customers${qs ? `?${qs}` : ""}`);
	},
	get: async (id) => request(`/customers/${id}`),
	create: async (payload) => request("/customers", { method: "POST", body: payload }),
	update: async (id, payload) => request(`/customers/${id}`, { method: "PUT", body: payload }),
	remove: async (id) => request(`/customers/${id}`, { method: "DELETE" }),
};

export const authApi = {
	register: async (payload) => request("/auth/register", { method: "POST", body: payload }),
	login: async (payload) => request("/auth/login", { method: "POST", body: payload }),
	me: async () => request("/auth/me"),
	updateMe: async (payload) => request("/auth/me", { method: "PUT", body: payload }),
	changePassword: async (payload) => request("/auth/password", { method: "PUT", body: payload }),
	logout: async () => request("/auth/logout", { method: "POST" }),
};

export const leadsApi = {
	list: async () => request("/leads"),
	convert: async (customerId, payload) => request(`/leads/${customerId}/convert`, { method: "POST", body: payload ?? {} }),
	update: async (leadId, payload) => request(`/leads/${leadId}`, { method: "PUT", body: payload }),
};

export const tasksApi = {
	listByCustomer: async (customerId) => request(`/customers/${customerId}/tasks`),
	create: async (customerId, payload) => request(`/customers/${customerId}/tasks`, { method: "POST", body: payload }),
	update: async (customerId, taskId, payload) =>
		request(`/customers/${customerId}/tasks/${taskId}`, { method: "PUT", body: payload }),
};

export const dashboardApi = {
	summary: async () => request("/dashboard/summary"),
	analytics: async () => request("/dashboard/analytics"),
};

export const activitiesApi = {
	listByCustomer: async (customerId, { limit } = {}) => {
		const params = new URLSearchParams();
		if (limit != null) params.set("limit", String(limit));
		const qs = params.toString();
		return request(`/customers/${customerId}/activities${qs ? `?${qs}` : ""}`);
	},
};

export const notificationsApi = {
	unreadCount: async () => request("/notifications/unread-count"),
	list: async ({ unreadOnly = false, limit } = {}) => {
		const params = new URLSearchParams();
		if (unreadOnly) params.set("unread_only", "true");
		if (limit != null) params.set("limit", String(limit));
		const qs = params.toString();
		return request(`/notifications${qs ? `?${qs}` : ""}`);
	},
	markRead: async (id) => request(`/notifications/${id}/read`, { method: "PUT" }),
	markAllRead: async () => request("/notifications/mark-all-read", { method: "POST" }),
};

export const notesApi = {
	listByCustomer: async (customerId) => request(`/customers/${customerId}/notes`),
	add: async (customerId, body) =>
		request(`/customers/${customerId}/notes`, { method: "POST", body: { body } }),
	update: async (customerId, noteId, body) =>
		request(`/customers/${customerId}/notes/${noteId}`, { method: "PUT", body: { body } }),
	remove: async (customerId, noteId) =>
		request(`/customers/${customerId}/notes/${noteId}`, { method: "DELETE" }),
};

export const usersApi = {
	list: async () => request("/users"),
};

export const isApiError = (err) => err && typeof err === "object" && err.name === "ApiError";

