import { getCustomerById } from "../models/customerModel.js";
import { listActivitiesByCustomer } from "../models/activitiesModel.js";

const parseId = (value) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) return null;
	return parsed;
};

export const listCustomerActivitiesHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const customerId = parseId(req.params.customerId);
		if (!customerId) return res.status(400).json({ message: "Invalid customer id" });

		const customer = await getCustomerById(workspaceId, customerId);
		if (!customer) return res.status(404).json({ message: "Customer not found" });

		const limit = req.query?.limit;
		const activities = await listActivitiesByCustomer({ workspaceId, customerId, limit });
		return res.json(activities);
	} catch (err) {
		return next(err);
	}
};
