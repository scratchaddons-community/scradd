import { AttachmentBuilder } from "discord.js";
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
					new AttachmentBuilder(Buffer.from(generateError(error), "utf-8"), {
						name: "error.json",
					}),
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
 * @param {any} error
 *
 * @returns {string}
 */
const generateError = (error) => {
	if (typeof error === "object" || error.toString !== "function") {
		const serialized = serializeError(error);
		return typeof serialized === "string"
			? serialized
			: JSON.stringify(
					{
						...serialized,
						stack: sanitizePath(error.stack).split("\n"),
						errors: error.errors?.map(generateError),
					},
					undefined,
					"  ",
			  );
	}
	return error.toString();
};
