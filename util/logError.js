import { sanitizePath } from "./files.js";
import log from "../common/moderation/logging.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { serializeError } from "serialize-error";

/**
 * @param {any} error
 * @param {string} event
 */
export default async function logError(error, event) {
	try {
		console.error(error);
		if (error && ["DeprecationWarning", "ExperimentalWarning"].includes(error.name)) return;

		return await log(
			`${CONSTANTS.emojis.statuses.no} **${error.name}** occurred in \`${event}\`!`,
			"server",
			{
				files: [
					{
						attachment: Buffer.from(generateError(error).toString(), "utf-8"),
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

/**
 * -
 *
 * @param {any} error
 * @param {boolean} [returnObject]
 *
 * @returns {Record<string, any> | string}
 */
const generateError = (error, returnObject = false) => {
	if (typeof error === "object" || error.toString !== "function") {
		const serialized = serializeError(error);

		if (typeof serialized === "string") return serialized;
		/** @type {unknown[]} */
		const subErrors =
			"errors" in error && error.errors instanceof Array ? error.errors : undefined;

		const object = {
			...serialized,
			stack: sanitizePath(error.stack).split("\n"),
			errors: subErrors?.map((sub) => generateError(sub, true)),
		};
		return returnObject ? object : JSON.stringify(object, null, "  ");
	}
	return error.toString();
};
