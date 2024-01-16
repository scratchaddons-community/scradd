import { inlineCode, type Message, type RepliableInteraction } from "discord.js";
import { serializeError } from "serialize-error";
import log, { LogSeverity, LoggingErrorEmoji } from "./misc.js";
import { cleanDatabaseListeners } from "../../common/database.js";
import { commandInteractionToString } from "../../util/discord.js";

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
	error: unknown,
	event: RepliableInteraction | string,
): Promise<Message<true> | undefined> {
	console.error(error);
	try {
		const name =
			error && typeof error === "object" && "name" in error ? `${error.name}` : "Error";
		if (
			"ExperimentalWarning" == name ||
			("DeprecationWarning" == name && process.env.NODE_ENV !== "production")
		)
			return;

		return await log(
			`${LoggingErrorEmoji} **${name}** occurred in ${
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
			LogSeverity.Alert,
			{
				files: [
					{
						content: JSON.stringify(generateError(error), undefined, "  "),
						extension: "json",
					},
				],
			},
		);
	} catch (loggingError) {
		console.error(loggingError);
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
export function generateError(error: unknown): object {
	if (typeof error === "object" && error) {
		const serialized = serializeError(error);
		delete serialized.name;
		delete serialized.message;
		delete serialized.stack;
		delete serialized.errors;
		delete serialized.cause;
		delete serialized.error;
		delete serialized.surpressed;
		delete serialized.reason;

		const subErrors =
			"errors" in error && Array.isArray(error.errors) ? error.errors : undefined;

		const object = {
			name: "name" in error ? error.name : undefined,
			message: "message" in error ? error.message : undefined,
			// eslint-disable-next-line unicorn/error-message
			stack: sanitizePath(`${("stack" in error ? error : new Error()).stack}`)
				.split("\n")
				.slice(1),
			errors: subErrors?.map((sub) => generateError(sub)),
			cause:
				"cause" in error
					? error.cause instanceof Error
						? generateError(error.cause)
						: error.cause
					: undefined,
			error: "error" in error ? generateError(error.error) : undefined,
			surpressed: "surpressed" in error ? generateError(error.surpressed) : undefined,
			reason: "reason" in error ? generateError(error.reason) : undefined,
			...(typeof serialized === "object" ? serialized : { serialized }),
		};
		return object;
	}
	return { error };
}

export function sanitizePath(unclean: string, relative = true): string {
	let decoded = undefined;
	try {
		decoded = decodeURIComponent(unclean);
	} catch {
		decoded = unclean;
	}

	const sanitized = decoded.replaceAll("\\", "/").replaceAll("file:///", "");
	return relative ? sanitized.replaceAll(sanitizePath(process.cwd(), false), ".") : sanitized;
}
