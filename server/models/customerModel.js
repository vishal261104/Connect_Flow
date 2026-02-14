import { query } from "../config/db.js";

const CUSTOMER_SELECT =
	"id, workspace_id, owner_user_id, assigned_user_id, name, phone, email, company, is_lead, lead_stage, deal_value, created_at, updated_at";

export const createCustomer = async ({ workspaceId, ownerUserId, assignedUserId = null, name, phone, email, company, isLead = false, leadStage = null, dealValue = null }) => {
	const result = await query(
		`
			INSERT INTO customers (workspace_id, owner_user_id, assigned_user_id, name, phone, email, company, is_lead, lead_stage, deal_value)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING ${CUSTOMER_SELECT};
		`,
		[
			workspaceId,
			ownerUserId,
			assignedUserId,
			name,
			phone ?? null,
			email ?? null,
			company ?? null,
			Boolean(isLead),
			leadStage,
			dealValue,
		]
	);
	return result.rows[0];
};


export const listCustomers = async (workspaceId, {
	q,
	isLead,
	leadStage,
	minDealValue,
	maxDealValue,
	createdFrom,
	createdTo,
} = {}) => {
	const where = ["workspace_id = $1"]; 
	const values = [workspaceId];
	let index = 2;

	const push = (clause, value) => {
		where.push(clause);
		values.push(value);
		index += 1;
	};

	if (q) {
		push(
			`(name ILIKE $${index} OR email ILIKE $${index} OR phone ILIKE $${index} OR company ILIKE $${index})`,
			`%${q}%`
		);
	}
	if (isLead != null) push(`is_lead = $${index}`, Boolean(isLead));
	if (leadStage) push(`COALESCE(lead_stage, 'New') = $${index}`, leadStage);
	if (minDealValue != null) push(`COALESCE(deal_value, 0) >= $${index}`, minDealValue);
	if (maxDealValue != null) push(`COALESCE(deal_value, 0) <= $${index}`, maxDealValue);
	if (createdFrom) push(`created_at >= $${index}`, createdFrom);
	if (createdTo) push(`created_at <= $${index}`, createdTo);

	const result = await query(
		`
			SELECT ${CUSTOMER_SELECT}
			FROM customers
			WHERE ${where.join(" AND ")}
			ORDER BY created_at DESC, id DESC;
		`,
		values
	);
	return result.rows;
};


export const listLeads = async (workspaceId) => {
	const result = await query(
		`
			SELECT ${CUSTOMER_SELECT}
			FROM customers
			WHERE workspace_id = $1
			  AND is_lead = TRUE
			ORDER BY updated_at DESC, id DESC;
		`,
		[workspaceId]
	);
	return result.rows;
};


export const getCustomerById = async (workspaceId, id) => {
	const result = await query(
		`
			SELECT ${CUSTOMER_SELECT}
			FROM customers
			WHERE workspace_id = $1 AND id = $2;
		`,
		[workspaceId, id]
	);
	return result.rows[0] ?? null;
};


export const getCustomerByEmail = async (workspaceId, email) => {
	const result = await query(
		`
			SELECT ${CUSTOMER_SELECT}
			FROM customers
			WHERE workspace_id = $1
			  AND LOWER(email) = LOWER($2)
			LIMIT 1;
		`,
		[workspaceId, email]
	);
	return result.rows[0] ?? null;
};


export const updateCustomer = async (workspaceId, id, { name, phone, email, company, isLead, leadStage, dealValue, assignedUserId }) => {
	const sets = [];
	const values = [];
	let index = 1;

	const pushSet = (column, value) => {
		sets.push(`${column} = $${index}`);
		values.push(value);
		index += 1;
	};

	if (name != null) pushSet("name", name);
	if (phone != null) pushSet("phone", phone);
	if (email != null) pushSet("email", email);
	if (company != null) pushSet("company", company);
	if (isLead != null) pushSet("is_lead", Boolean(isLead));
	if (leadStage != null) pushSet("lead_stage", leadStage);
	if (dealValue != null) pushSet("deal_value", dealValue);
	if (assignedUserId !== undefined) pushSet("assigned_user_id", assignedUserId);

	if (sets.length === 0) return await getCustomerById(workspaceId, id);

	values.push(workspaceId);
	values.push(id);
	const result = await query(
		`
			UPDATE customers
			SET ${sets.join(", ")}, updated_at = NOW()
			WHERE workspace_id = $${index} AND id = $${index + 1}
			RETURNING ${CUSTOMER_SELECT};
		`,
		values
	);
	return result.rows[0] ?? null;
};

export const convertCustomerToLead = async (workspaceId, id, { dealValue = null } = {}) => {
	const result = await query(
		`
			UPDATE customers
			SET is_lead = TRUE,
				lead_stage = COALESCE(lead_stage, 'New'),
				deal_value = COALESCE($3, deal_value),
				updated_at = NOW()
			WHERE workspace_id = $1 AND id = $2
			RETURNING ${CUSTOMER_SELECT};
		`,
		[workspaceId, id, dealValue]
	);
	return result.rows[0] ?? null;
};

export const updateLeadStage = async (workspaceId, id, { stage, dealValue }) => {
	const result = await query(
		`
			UPDATE customers
			SET lead_stage = $3,
				deal_value = COALESCE($4, deal_value),
				updated_at = NOW()
			WHERE workspace_id = $1 AND id = $2 AND is_lead = TRUE
			RETURNING ${CUSTOMER_SELECT};
		`,
		[workspaceId, id, stage, dealValue ?? null]
	);
	return result.rows[0] ?? null;
};


export const deleteCustomer = async (workspaceId, id) => {
	const result = await query(
		`
			DELETE FROM customers
			WHERE workspace_id = $1 AND id = $2
			RETURNING id;
		`,
		[workspaceId, id]
	);
	return (result.rowCount ?? 0) > 0;
};
