import { AttachmentBuilder } from "discord.js";
import { escapeMessage } from "./markdown.js";
import { sanitizePath } from "./files.js";
import log from "../common/moderation/logging.js";
import CONSTANTS from "../common/CONSTANTS.js";

/**
 * @param {any} error
 * @param {string} event
 */
export default async function logError(error, event) {
	try {
		console.error(error);
		if (
			error &&
			["DeprecationWarning", "ExperimentalWarning"].includes(/** @type {any} */ (error).name)
		)
			return;

		return await log(
			`${CONSTANTS.emojis.statuses.no} ${error.name} occurred in **${escapeMessage(
				event,
			)}**!`,
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
		const { cleanListeners } = await import("../common/database.js");
		await cleanListeners().catch(() => {});
		process.exit(1);
	}
}

/**
 * @param {any} error
 *
 * @returns {string}
 */
const generateError = (error) => {
	return typeof error.toString !== "function" || typeof error === "object"
		? JSON.stringify(
				error.prototype instanceof Error || error instanceof Error
					? {
							...error,
							stack: sanitizePath(error.stack).split("\n"),
							errors: error.errors?.map(generateError),
					  }
					: { ...error },
				undefined,
				"  ",
		  )
		: error.toString();
};
