import { sanitizePath } from "./files.js";
import log from "../common/logging.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { serializeError } from "serialize-error";

export default async function logError(error: any, event: string) {
	try {
		console.error(error);
		if (error && ["DeprecationWarning", "ExperimentalWarning"].includes(error.name)) return;

		return await log(
			`${CONSTANTS.emojis.statuses.no} **${error.name}** occurred in \`${event}\`!`,
			"server",
			{
				files: [
					{
						attachment: Buffer.from(generateError(error), "utf-8"),
						name: "error.json",
					},
				],
			},
		);
	} catch (errorError) {
		console.error(errorError);
		const { cleanDatabaseListeners } = await import("../common/database.js");
		await cleanDatabaseListeners().catch(console.error);
		process.exit(1);
	}
}

export function generateError(error: any, returnObject: true): Record<string, any>;
export function generateError(error: any, returnObject?: false): string;
export function generateError(
	error: any,
	returnObject: boolean = false,
): Record<string, any> | string {
	if (typeof error === "object" || error.toString !== "function") {
		const serialized = serializeError(error);

		if (typeof serialized === "string") return serialized;
		delete serialized.name;
		delete serialized.message;
		delete serialized.stack;
		delete serialized.errors;

		/** @type {unknown[]} */
		const subErrors: unknown[] =
			"errors" in error && error.errors instanceof Array ? error.errors : undefined;

		const object = {
			name: returnObject ? error.name : undefined,
			message: error.message,
			stack: sanitizePath(error.stack || new Error().stack).split("\n"),
			errors: subErrors?.map((sub) => generateError(sub, true)),
			...(typeof serialized === "object" ? serialized : { serialized }),
		};
		return returnObject ? object : JSON.stringify(object, null, "  ");
	}
	return error.toString();
}
