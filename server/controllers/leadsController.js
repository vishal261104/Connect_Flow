import { convertCustomerToLead, listLeads, updateLeadStage } from "../models/customerModel.js";
import { createActivity } from "../models/activitiesModel.js";

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
		const workspaceId = Number(req.user?.workspaceId);
		const leads = await listLeads(workspaceId);
		return res.json(leads);
	} catch (err) {
		return next(err);
	}
};

export const convertToLeadHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const actorUserId = Number(req.user?.id);
		const customerId = parseId(req.params.id);
		if (!customerId) return res.status(400).json({ message: "Invalid customer id" });

		const dealValue = parseDealValue(req.body?.deal_value);
		if (dealValue === undefined) return res.status(400).json({ message: "Invalid deal value" });

		const lead = await convertCustomerToLead(workspaceId, customerId, { dealValue });
		if (!lead) return res.status(404).json({ message: "Customer not found" });
		await createActivity({
			workspaceId,
			customerId: Number(lead.id),
			actorUserId,
			type: "LEAD_CONVERTED",
			data: { deal_value: lead.deal_value ?? null, lead_stage: lead.lead_stage ?? "New" },
		});
		return res.json(lead);
	} catch (err) {
		return next(err);
	}
};

export const updateLeadStageHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		const actorUserId = Number(req.user?.id);
		const leadId = parseId(req.params.id);
		if (!leadId) return res.status(400).json({ message: "Invalid lead id" });

		const stage = String(req.body?.lead_stage ?? "").trim();
		if (!LEAD_STAGES.has(stage)) return res.status(400).json({ message: "Invalid lead stage" });

		const dealValue = parseDealValue(req.body?.deal_value);
		if (dealValue === undefined) return res.status(400).json({ message: "Invalid deal value" });

		const updated = await updateLeadStage(workspaceId, leadId, { stage, dealValue });
		if (!updated) return res.status(404).json({ message: "Lead not found" });
		await createActivity({
			workspaceId,
			customerId: Number(updated.id),
			actorUserId,
			type: "LEAD_STAGE_CHANGED",
			data: { lead_stage: updated.lead_stage, deal_value: updated.deal_value ?? null },
		});
		return res.json(updated);
	} catch (err) {
		return next(err);
	}
};
