import { query } from "../config/db.js";
import { countTasksPendingToday } from "../models/tasksModel.js";

const LEAD_STAGES = ["New", "Contacted", "Interested", "Closed"];

export const dashboardSummaryHandler = async (req, res, next) => {
	try {
		const ownerUserId = Number(req.user?.id);

		const customersResult = await query(
			`SELECT COUNT(*)::bigint AS count FROM customers WHERE owner_user_id = $1;`,
			[ownerUserId]
		);
		const leadsResult = await query(
			`SELECT COUNT(*)::bigint AS count FROM customers WHERE owner_user_id = $1 AND is_lead = TRUE;`,
			[ownerUserId]
		);
		const perStageResult = await query(
			`
				SELECT COALESCE(lead_stage, 'New') AS stage, COUNT(*)::bigint AS count
				FROM customers
				WHERE owner_user_id = $1 AND is_lead = TRUE
				GROUP BY COALESCE(lead_stage, 'New');
			`,
			[ownerUserId]
		);

		const perStage = Object.fromEntries(LEAD_STAGES.map((s) => [s, 0]));
		for (const row of perStageResult.rows ?? []) {
			const stage = String(row.stage ?? "");
			if (stage in perStage) perStage[stage] = Number(row.count ?? 0);
		}

		const tasksPendingToday = await countTasksPendingToday({ ownerUserId });
		return res.json({
			totalCustomers: Number(customersResult.rows?.[0]?.count ?? 0),
			totalLeads: Number(leadsResult.rows?.[0]?.count ?? 0),
			leadsPerStage: perStage,
			tasksPendingToday,
		});
	} catch (err) {
		return next(err);
	}
};
