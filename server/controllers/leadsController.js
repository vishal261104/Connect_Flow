import { convertCustomerToLead, listLeads, updateLeadStage } from "../models/customerModel.js";

const parseId = (value) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) return null;
	return parsed;
};

const LEAD_STAGES = new Set(["New", "Contacted", "Interested", "Closed"]);

const parseDealValue = (value) => {
	if (value == null || value === "") return null;
	const n = Number(value);
	if (!Number.isFinite(n) || n < 0) return undefined;
	return n;
};

export const listLeadsHandler = async (req, res, next) => {
	try {
		const ownerUserId = Number(req.user?.id);
		const leads = await listLeads(ownerUserId);
		return res.json(leads);
	} catch (err) {
		return next(err);
	}
};

export const convertToLeadHandler = async (req, res, next) => {
	try {
		const ownerUserId = Number(req.user?.id);
		const customerId = parseId(req.params.id);
		if (!customerId) return res.status(400).json({ message: "Invalid customer id" });

		const dealValue = parseDealValue(req.body?.deal_value);
		if (dealValue === undefined) return res.status(400).json({ message: "Invalid deal value" });

		const lead = await convertCustomerToLead(ownerUserId, customerId, { dealValue });
		if (!lead) return res.status(404).json({ message: "Customer not found" });
		return res.json(lead);
	} catch (err) {
		return next(err);
	}
};

export const updateLeadStageHandler = async (req, res, next) => {
	try {
		const ownerUserId = Number(req.user?.id);
		const leadId = parseId(req.params.id);
		if (!leadId) return res.status(400).json({ message: "Invalid lead id" });

		const stage = String(req.body?.lead_stage ?? "").trim();
		if (!LEAD_STAGES.has(stage)) return res.status(400).json({ message: "Invalid lead stage" });

		const dealValue = parseDealValue(req.body?.deal_value);
		if (dealValue === undefined) return res.status(400).json({ message: "Invalid deal value" });

		const updated = await updateLeadStage(ownerUserId, leadId, { stage, dealValue });
		if (!updated) return res.status(404).json({ message: "Lead not found" });
		return res.json(updated);
	} catch (err) {
		return next(err);
	}
};
