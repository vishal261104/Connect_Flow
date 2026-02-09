import { query } from "../config/db.js";


const CUSTOMER_SELECT =
	"id, owner_user_id, name, phone, email, company, is_lead, lead_stage, deal_value, created_at, updated_at";

export const createCustomer = async ({ ownerUserId, name, phone, email, company, isLead = false, leadStage = null, dealValue = null }) => {
	const result = await query(
		`
			INSERT INTO customers (owner_user_id, name, phone, email, company, is_lead, lead_stage, deal_value)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING ${CUSTOMER_SELECT};
		`,
		[ownerUserId, name, phone ?? null, email ?? null, company ?? null, Boolean(isLead), leadStage, dealValue]
	);
	return result.rows[0];
};


export const listCustomers = async (ownerUserId) => {
	const result = await query(
		`
			SELECT ${CUSTOMER_SELECT}
			FROM customers
			WHERE owner_user_id = $1
			ORDER BY created_at DESC, id DESC;
		`,
		[ownerUserId]
	);
	return result.rows;
};

export const listLeads = async (ownerUserId) => {
	const result = await query(
		`
			SELECT ${CUSTOMER_SELECT}
			FROM customers
			WHERE owner_user_id = $1
			  AND is_lead = TRUE
			ORDER BY updated_at DESC, id DESC;
		`,
		[ownerUserId]
	);
	return result.rows;
};


export const getCustomerById = async (ownerUserId, id) => {
	const result = await query(
		`
			SELECT ${CUSTOMER_SELECT}
			FROM customers
			WHERE owner_user_id = $1 AND id = $2;
		`,
		[ownerUserId, id]
	);
	return result.rows[0] ?? null;
};


export const getCustomerByEmail = async (ownerUserId, email) => {
	const result = await query(
		`
			SELECT ${CUSTOMER_SELECT}
			FROM customers
			WHERE owner_user_id = $1
			  AND LOWER(email) = LOWER($2)
			LIMIT 1;
		`,
		[ownerUserId, email]
	);
	return result.rows[0] ?? null;
};


export const updateCustomer = async (ownerUserId, id, { name, phone, email, company, isLead, leadStage, dealValue }) => {
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

	if (sets.length === 0) return await getCustomerById(ownerUserId, id);

	values.push(ownerUserId);
	values.push(id);
	const result = await query(
		`
			UPDATE customers
			SET ${sets.join(", ")}, updated_at = NOW()
			WHERE owner_user_id = $${index} AND id = $${index + 1}
			RETURNING ${CUSTOMER_SELECT};
		`,
		values
	);
	return result.rows[0] ?? null;
};

export const convertCustomerToLead = async (ownerUserId, id, { dealValue = null } = {}) => {
	const result = await query(
		`
			UPDATE customers
			SET is_lead = TRUE,
				lead_stage = COALESCE(lead_stage, 'New'),
				deal_value = COALESCE($3, deal_value),
				updated_at = NOW()
			WHERE owner_user_id = $1 AND id = $2
			RETURNING ${CUSTOMER_SELECT};
		`,
		[ownerUserId, id, dealValue]
	);
	return result.rows[0] ?? null;
};

export const updateLeadStage = async (ownerUserId, id, { stage, dealValue }) => {
	const result = await query(
		`
			UPDATE customers
			SET lead_stage = $3,
				deal_value = COALESCE($4, deal_value),
				updated_at = NOW()
			WHERE owner_user_id = $1 AND id = $2 AND is_lead = TRUE
			RETURNING ${CUSTOMER_SELECT};
		`,
		[ownerUserId, id, stage, dealValue ?? null]
	);
	return result.rows[0] ?? null;
};


export const deleteCustomer = async (ownerUserId, id) => {
	const result = await query(
		`
			DELETE FROM customers
			WHERE owner_user_id = $1 AND id = $2
			RETURNING id;
		`,
		[ownerUserId, id]
	);
	return (result.rowCount ?? 0) > 0;
};
