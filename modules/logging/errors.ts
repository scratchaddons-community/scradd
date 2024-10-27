import type { Message, RepliableInteraction } from "discord.js";

import { inlineCode } from "discord.js";
import { serializeError } from "serialize-error";

import { prepareExit } from "../../common/database.js";
import { commandInteractionToString } from "../../util/discord.js";
import log, { LoggingErrorEmoji, LogSeverity } from "./misc.js";

process
	.on("uncaughtException", (error, origin) => logError(error, origin))
	.on("warning", (error) => logError(error, "warning"));

/**
 * Log an error in #mod-logs.
 *
 * @param error - The error to log.
 * @param event - The event this error occurred in.
 * @returns The logged message.
 */
export default async function logError(
	error: unknown,
	event: RepliableInteraction | string,
): Promise<Message<true> | undefined> {
	console.error(error);
	try {
		const name =
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			error && typeof error === "object" && "name" in error ? `${error.name}` : "Error";
		if (
			"ExperimentalWarning" == name ||
			("DeprecationWarning" == name && process.env.NODE_ENV !== "production")
		)
			return;

		return await log(
			`${LoggingErrorEmoji} **${name}** occurred in ${
				typeof event == "string" ? inlineCode(event)
				: event.isChatInputCommand() ? commandInteractionToString(event)
				: inlineCode(
						event.isCommand() && event.command ?
							`/${event.command.name}`
						:	`${event.constructor.name}${
								event.isButton() ? `: ${event.customId}` : ""
							}`,
					)
			}`,
			LogSeverity.ImportantUpdate,
			{ files: [{ content: stringifyError(error), extension: "json" }] },
		);
	} catch (loggingError) {
		console.error(loggingError);
		await prepareExit().catch(console.error);
		process.exit(1);
	}
}

export function stringifyError(error: unknown): string {
	return JSON.stringify(
		error,
		(_, value) =>
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			typeof value === "bigint" || typeof value === "symbol" ? value.toString()
			: value instanceof Error ? generateError(value)
			: value,
		"  ",
	);
}
function generateError(error: unknown): object {
	if (typeof error !== "object" || !error) return { error };

	const serialized = serializeError(error);
	delete serialized.name;
	delete serialized.code;
	delete serialized.message;
	delete serialized.stack;

	const message =
		"message" in error ?
			typeof error.message === "string" && error.message.includes("\n") ?
				error.message.split("\n")
			:	error.message
		:	undefined;
	// eslint-disable-next-line unicorn/error-message
	const { stack } = "stack" in error ? error : new Error();

	return {
		name: "name" in error ? error.name : undefined,
		code: "code" in error ? error.code : undefined,
		message,
		stack:
			typeof stack === "string" ?
				sanitizePath(stack)
					.split("\n")
					.slice(Array.isArray(message) ? message.length : 1)
			:	stack,
		...serialized,
	};
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
