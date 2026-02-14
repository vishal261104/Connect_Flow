import { query } from "../config/db.js";
import { countTasksPendingToday } from "../models/tasksModel.js";

const LEAD_STAGES = ["New", "Contacted", "Interested", "Closed"];

export const dashboardSummaryHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);

		const customersResult = await query(
			`SELECT COUNT(*)::bigint AS count FROM customers WHERE workspace_id = $1;`,
			[workspaceId]
		);
		const leadsResult = await query(
			`SELECT COUNT(*)::bigint AS count FROM customers WHERE workspace_id = $1 AND is_lead = TRUE;`,
			[workspaceId]
		);
		const perStageResult = await query(
			`
				SELECT COALESCE(lead_stage, 'New') AS stage, COUNT(*)::bigint AS count
				FROM customers
				WHERE workspace_id = $1 AND is_lead = TRUE
				GROUP BY COALESCE(lead_stage, 'New');
			`,
			[workspaceId]
		);

		const perStage = Object.fromEntries(LEAD_STAGES.map((s) => [s, 0]));
		for (const row of perStageResult.rows ?? []) {
			const stage = String(row.stage ?? "");
			if (stage in perStage) perStage[stage] = Number(row.count ?? 0);
		}

		const tasksPendingToday = await countTasksPendingToday({ workspaceId });
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

export const dashboardAnalyticsHandler = async (req, res, next) => {
	try {
		const workspaceId = Number(req.user?.workspaceId);
		if (!workspaceId) return res.status(401).json({ message: "Unauthorized" });

		const dayKey = (date) => {
			const d = new Date(date);
			if (Number.isNaN(d.getTime())) return "";
			const y = d.getUTCFullYear();
			const m = String(d.getUTCMonth() + 1).padStart(2, "0");
			const dd = String(d.getUTCDate()).padStart(2, "0");
			return `${y}-${m}-${dd}`;
		};

		const monthKey = (date) => {
			const d = new Date(date);
			if (Number.isNaN(d.getTime())) return "";
			const y = d.getUTCFullYear();
			const m = String(d.getUTCMonth() + 1).padStart(2, "0");
			return `${y}-${m}`;
		};

		const last12Months = (() => {
			const now = new Date();
			const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
			start.setUTCMonth(start.getUTCMonth() - 11);
			const months = [];
			for (let i = 0; i < 12; i += 1) {
				const d = new Date(start);
				d.setUTCMonth(start.getUTCMonth() + i);
				months.push(monthKey(d));
			}
			return months;
		})();

		// Keep daily revenue limited (roughly 3 years) to bound payload size.
		const DAILY_POINTS = 1095;
		const todayUtc = (() => {
			const n = new Date();
			return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
		})();
		const startUtc = (() => {
			const d = new Date(todayUtc);
			d.setUTCDate(d.getUTCDate() - (DAILY_POINTS - 1));
			return d;
		})();

		const [
			customersCurrentMonthDailyResult,
			leadsCountsByStageResult,
			leadValueByStageResult,
			taskStatusLast30Result,
			closedRevenueMonthlyResult,
			closedRevenueDailyResult,
		] =
			await Promise.all([
				query(
					`
						SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
							   COUNT(*)::bigint AS count
						FROM customers
						WHERE workspace_id = $1
						  AND created_at >= date_trunc('month', NOW())
						  AND created_at < date_trunc('month', NOW()) + interval '1 month'
						GROUP BY date_trunc('day', created_at)
						ORDER BY date_trunc('day', created_at) ASC;
					`,
					[workspaceId]
				),
				query(
					`
						SELECT COALESCE(lead_stage, 'New') AS stage, COUNT(*)::bigint AS count
						FROM customers
						WHERE workspace_id = $1 AND is_lead = TRUE
						GROUP BY COALESCE(lead_stage, 'New');
					`,
					[workspaceId]
				),
				query(
					`
						SELECT COALESCE(lead_stage, 'New') AS stage,
							   SUM(COALESCE(deal_value, 0))::float8 AS value
						FROM customers
						WHERE workspace_id = $1 AND is_lead = TRUE
						GROUP BY COALESCE(lead_stage, 'New');
					`,
					[workspaceId]
				),
				query(
					`
						SELECT status, COUNT(*)::bigint AS count
						FROM tasks
						WHERE workspace_id = $1
						  AND created_at >= NOW() - interval '30 days'
						GROUP BY status;
					`,
					[workspaceId]
				),
				query(
					`
						SELECT to_char(date_trunc('month', updated_at), 'YYYY-MM') AS month,
							   SUM(COALESCE(deal_value, 0))::float8 AS revenue
						FROM customers
						WHERE workspace_id = $1
						  AND is_lead = TRUE
						  AND COALESCE(lead_stage, 'New') = 'Closed'
						  AND updated_at >= date_trunc('month', NOW()) - interval '11 months'
						  AND updated_at < date_trunc('month', NOW()) + interval '1 month'
						GROUP BY date_trunc('month', updated_at)
						ORDER BY date_trunc('month', updated_at) ASC;
					`,
					[workspaceId]
				),
				query(
					`
						SELECT to_char(date_trunc('day', updated_at), 'YYYY-MM-DD') AS day,
							   SUM(COALESCE(deal_value, 0))::float8 AS revenue
						FROM customers
						WHERE workspace_id = $1
						  AND is_lead = TRUE
						  AND COALESCE(lead_stage, 'New') = 'Closed'
						  AND updated_at >= $2
						  AND updated_at < $3
						GROUP BY date_trunc('day', updated_at)
						ORDER BY date_trunc('day', updated_at) ASC;
					`,
					[workspaceId, startUtc.toISOString(), new Date(todayUtc.getTime() + 24 * 60 * 60 * 1000).toISOString()]
				),
			]);

		const customersCurrentMonthDaily = (customersCurrentMonthDailyResult.rows ?? []).map((r) => ({
			day: String(r.day),
			count: Number(r.count ?? 0),
		}));

		const leadCountsByStage = Object.fromEntries(LEAD_STAGES.map((s) => [s, 0]));
		for (const row of leadsCountsByStageResult.rows ?? []) {
			const stage = String(row.stage ?? "");
			if (stage in leadCountsByStage) leadCountsByStage[stage] = Number(row.count ?? 0);
		}

		const leadValueByStage = Object.fromEntries(LEAD_STAGES.map((s) => [s, 0]));
		for (const row of leadValueByStageResult.rows ?? []) {
			const stage = String(row.stage ?? "");
			if (stage in leadValueByStage) leadValueByStage[stage] = Number(row.value ?? 0);
		}

		const taskStatusLast30 = { Pending: 0, Completed: 0 };
		for (const row of taskStatusLast30Result.rows ?? []) {
			const status = String(row.status ?? "");
			if (status in taskStatusLast30) taskStatusLast30[status] = Number(row.count ?? 0);
		}

		const closedRevenueByMonth = new Map();
		for (const row of closedRevenueMonthlyResult.rows ?? []) {
			const month = String(row.month ?? "");
			const revenue = Number(row.revenue ?? 0);
			if (month) closedRevenueByMonth.set(month, revenue);
		}
		const closedRevenueMonthly = last12Months.map((month) => ({
			month,
			revenue: Number(closedRevenueByMonth.get(month) ?? 0),
		}));

		const closedRevenueByDay = new Map();
		for (const row of closedRevenueDailyResult.rows ?? []) {
			const day = String(row.day ?? "");
			const revenue = Number(row.revenue ?? 0);
			if (day) closedRevenueByDay.set(day, revenue);
		}
		const closedRevenueDaily = [];
		for (let i = 0; i < DAILY_POINTS; i += 1) {
			const d = new Date(startUtc);
			d.setUTCDate(startUtc.getUTCDate() + i);
			const key = dayKey(d);
			closedRevenueDaily.push({
				day: key,
				revenue: Number(closedRevenueByDay.get(key) ?? 0),
			});
		}

		const closedRevenue = Number(leadValueByStage.Closed ?? 0);
		const pipelineValue = LEAD_STAGES.filter((s) => s !== "Closed").reduce(
			(sum, stage) => sum + Number(leadValueByStage[stage] ?? 0),
			0
		);

		return res.json({
			customersCurrentMonthDaily,
			leadCountsByStage,
			leadValueByStage,
			taskStatusLast30,
			closedRevenueMonthly,
			closedRevenueDaily,
			revenue: {
				closedRevenue,
				pipelineValue,
			},
		});
	} catch (err) {
		return next(err);
	}
};
