import type { Message } from "discord.js";
import { serializeError } from "serialize-error";

import log, { LoggingEmojis } from "../modules/modlogs/misc.js";
import { sanitizePath } from "../util/files.js";
import { cleanDatabaseListeners } from "./database.js";

process
	.on("uncaughtException", (error, origin) => logError(error, origin))
	.on("warning", (error) => logError(error, "warning"));

/**
 * Log an error in #mod-logs.
 *
 * @param error - The error to log.
 * @param event - The event this error occurred in.
 *
 * @returns The logged message.
 */
export default async function logError(
	error: any,
	event: string,
): Promise<Message<true> | undefined> {
	try {
		console.error(error);
		if (error && ["DeprecationWarning", "ExperimentalWarning"].includes(error.name)) return;

		return await log(
			`${LoggingEmojis.Error} **${error.name}** occurred in \`${event}\``, // todo chat input cmd errors
			"server",
			{ files: [{ content: generateError(error), extension: "json" }] },
		);
	} catch (errorError) {
		console.error(errorError);
		await cleanDatabaseListeners().catch(console.error);
		process.exit(1);
	}
}

/**
 * Standardize an error.
 *
 * @param error The error to standardize.
 * @param returnObject Whether to return an object.
 *
 * @returns The standardized error.
 */
export function generateError(error: any, returnObject: true): { [key: string]: any };
export function generateError(error: any, returnObject?: false): string;
export function generateError(error: any, returnObject = false): string | { [key: string]: any } {
	if (typeof error === "object" || error.toString !== "function") {
		const serialized = serializeError(error);

		if (typeof serialized === "string") return serialized;
		delete serialized.name;
		delete serialized.message;
		delete serialized.stack;
		delete serialized.errors;

		const subErrors: unknown[] | undefined =
			"errors" in error && Array.isArray(error.errors) ? error.errors : undefined;

		const object = {
			name: returnObject ? error.name : undefined,
			message: error.message,
			stack: sanitizePath(error.stack || new Error("dummy message").stack).split("\n"),
			errors: subErrors?.map((sub) => generateError(sub, true)),
			...(typeof serialized === "object" ? serialized : { serialized }),
		};
		return returnObject ? object : JSON.stringify(object, undefined, "  ");
	}
	return error.toString();
}
