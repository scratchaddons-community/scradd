import { inlineCode, Message, type RepliableInteraction } from "discord.js";
import { serializeError } from "serialize-error";
import log, { LoggingErrorEmoji } from "../modules/logging/misc.js";
import { sanitizePath } from "../util/files.js";
import { cleanDatabaseListeners } from "./database.js";
import { commandInteractionToString } from "../util/discord.js";

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
	event: string | RepliableInteraction,
): Promise<Message<true> | undefined> {
	try {
		console.error(error);
		if (error && ["DeprecationWarning", "ExperimentalWarning"].includes(error.name)) return;

		return await log(
			`${LoggingErrorEmoji} **${error.name}** occurred in ${
				typeof event == "string"
					? inlineCode(event)
					: event.isChatInputCommand()
					? commandInteractionToString(event)
					: inlineCode(
							event.isCommand()
								? `/${event.command?.name}`
								: `${event.constructor.name}: ${event.customId}`,
					  )
			}`,
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
export function generateError(error: unknown, returnObject: true): { [key: string]: any };
export function generateError(error: unknown, returnObject?: false): string;
export function generateError(
	error: unknown,
	returnObject = false,
): string | { [key: string]: any } {
	if (typeof error === "object" && error) {
		const serialized = serializeError(error);

		if (typeof serialized === "string") return serialized;
		delete serialized.name;
		delete serialized.message;
		delete serialized.stack;
		delete serialized.errors;
		delete serialized.cause;

		const subErrors =
			"errors" in error && Array.isArray(error.errors) ? error.errors : undefined;

		const object = {
			name: returnObject && "name" in error ? error.name : undefined,
			message: "message" in error ? error.message : undefined,
			stack: sanitizePath(
				`${("stack" in error ? error : new Error("dummy message")).stack}`,
			).split("\n"),
			errors: subErrors?.map((sub) => generateError(sub, true)),
			cause: "cause" in error ? generateError(error.cause, true) : undefined,
			...(typeof serialized === "object" ? serialized : { serialized }),
		};
		return returnObject ? object : JSON.stringify(object, undefined, "  ");
	}
	return `${error}`;
}
