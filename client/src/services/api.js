const API_BASE = "/api";

class ApiError extends Error {
	constructor(message, { status, details } = {}) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.details = details;
	}
}

const request = async (path, { method = "GET", body } = {}) => {
	const response = await fetch(`${API_BASE}${path}`, {
		method,
		headers: body ? { "Content-Type": "application/json" } : undefined,
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
