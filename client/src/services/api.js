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
	list: async () => request("/customers"),
	get: async (id) => request(`/customers/${id}`),
	create: async (payload) => request("/customers", { method: "POST", body: payload }),
	update: async (id, payload) => request(`/customers/${id}`, { method: "PUT", body: payload }),
	remove: async (id) => request(`/customers/${id}`, { method: "DELETE" }),
};

export const authApi = {
	register: async (payload) => request("/auth/register", { method: "POST", body: payload }),
	login: async (payload) => request("/auth/login", { method: "POST", body: payload }),
	me: async () => request("/auth/me"),
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

export const isApiError = (err) => err && typeof err === "object" && err.name === "ApiError";

