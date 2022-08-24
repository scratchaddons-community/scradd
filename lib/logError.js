import { AttachmentBuilder } from "discord.js";
import { escapeMessage } from "./markdown.js";
import { sanitizePath } from "./files.js";
import log from "../common/moderation/logging.js";
import CONSTANTS from "../common/CONSTANTS.js";

/**
 * @param {unknown} error
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
			`${CONSTANTS.emojis.statuses.no} Error occurred in **${escapeMessage(event)}**!`,
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
	return !("toString" in error) ||
		typeof error.toString !== "function" ||
		error.toString().startsWith("[object ") ||
		error.prototype instanceof Error ||
		error instanceof Error
		? JSON.stringify(
				error.prototype instanceof Error || error instanceof Error
					? {
							name: error.name,
							message: error.message,
							type: error.type,
							code:
								error.code &&
								Object.keys(error)[
									Object.values(error).findIndex((val) => val === error.code)
								],
							number: error.errno,
							errors: error.errors?.map(generateError),
							actual: error.actual,
							expected: error.expected,
							generated: error.generatedMessage,
							operator: error.operator,
							global: error.global,
							limit: error.limit,
							method: error.method,
							path: error.path,
							route: error.route,
							timeout: error.timeout,
							constraint: error.constraint,
							stack: sanitizePath(error.stack).split("\n"),
							...error,
					  }
					: { ...error },
				undefined,
				"  ",
		  )
		: error.toString();
};
