import { query } from "../config/db.js";

export const createCustomer = async ({ name, phone, email, company }) => {
	const result = await query(
		`
			INSERT INTO customers (name, phone, email, company)
			VALUES ($1, $2, $3, $4)
			RETURNING id, name, phone, email, company, created_at, updated_at;
		`,
		[name, phone ?? null, email ?? null, company ?? null]
	);
	return result.rows[0];
};

export const listCustomers = async () => {
	const result = await query(
		`
			SELECT id, name, phone, email, company, created_at, updated_at
			FROM customers
			ORDER BY created_at DESC, id DESC;
		`
	);
	return result.rows;
};

export const getCustomerById = async (id) => {
	const result = await query(
		`
			SELECT id, name, phone, email, company, created_at, updated_at
			FROM customers
			WHERE id = $1;
		`,
		[id]
	);
	return result.rows[0] ?? null;
};

export const getCustomerByEmail = async (email) => {
	const result = await query(
		`
			SELECT id, name, phone, email, company, created_at, updated_at
			FROM customers
			WHERE LOWER(email) = LOWER($1)
			LIMIT 1;
		`,
		[email]
	);
	return result.rows[0] ?? null;
};

export const updateCustomer = async (id, { name, phone, email, company }) => {
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

	if (sets.length === 0) return await getCustomerById(id);

	values.push(id);
	const result = await query(
		`
			UPDATE customers
			SET ${sets.join(", ")}, updated_at = NOW()
			WHERE id = $${index}
			RETURNING id, name, phone, email, company, created_at, updated_at;
		`,
		values
	);
	return result.rows[0] ?? null;
};

export const deleteCustomer = async (id) => {
	const result = await query(
		`
			DELETE FROM customers
			WHERE id = $1
			RETURNING id;
		`,
		[id]
	);
	return (result.rowCount ?? 0) > 0;
};
