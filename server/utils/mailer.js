import nodemailer from "nodemailer";
import { logger } from "./logger.js";

let transporter;

const required = (name) => {
	const value = (process.env[name] ?? "").trim();
	if (!value) throw new Error(`Missing ${name}`);
	return value;
};

export const isSmtpConfigured = () => {
	const host = (process.env.SMTP_HOST ?? "").trim();
	const port = (process.env.SMTP_PORT ?? "").trim();
	const user = (process.env.SMTP_USER ?? "").trim();
	const pass = (process.env.SMTP_PASS ?? "").trim();
	return Boolean(host && port && user && pass);
};

export const getTransporter = () => {
	if (transporter) return transporter;

	const host = required("SMTP_HOST");
	const port = Number(required("SMTP_PORT"));
	const user = required("SMTP_USER");
	const pass = required("SMTP_PASS");
	const secure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true";

	transporter = nodemailer.createTransport({
		host,
		port,
		secure,
		auth: { user, pass },
	});

	return transporter;
};

export const sendVerificationEmail = async ({ to, verifyUrl }) => {
	const from = (process.env.SMTP_FROM ?? "").trim() || (process.env.SMTP_USER ?? "").trim();
	if (!from) throw new Error("Missing SMTP_FROM (or SMTP_USER)");

	const appName = (process.env.APP_NAME ?? "CRM").trim() || "CRM";
	const transport = getTransporter();

	const subject = `${appName}: Verify your email`;
	const text = `Verify your email to add the customer:\n\n${verifyUrl}\n\nIf you did not request this, you can ignore this email.`;
	const html = `
		<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.5;">
			<h2 style="margin: 0 0 12px;">Verify your email</h2>
			<p style="margin: 0 0 14px;">Click this link to verify and add the customer:</p>
			<p style="margin: 0 0 18px;"><a href="${verifyUrl}">${verifyUrl}</a></p>
			<p style="margin: 0; color: #666;">If you did not request this, ignore this email.</p>
		</div>
	`;

	const info = await transport.sendMail({ from, to, subject, text, html });
	logger.info("Verification email sent", { to, messageId: info.messageId });
};
