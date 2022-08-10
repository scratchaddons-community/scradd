import { Client, AttachmentBuilder } from "discord.js";
import { escapeMessage } from "./markdown.js";
import { sanitizePath } from "./text.js";
import log from "../common/moderation/logging.js";
import { cleanListeners } from "../common/databases.js";

/**
 * @param {unknown} error
 * @param {string} event
 * @param {Client} client
 */
export default async function logError(error, event, client) {
	try {
		console.error(error);
		const guild = await client.guilds.fetch(process.env.GUILD_ID || "");

		return await log(guild, `Error occurred in **${escapeMessage(event)}**!`, "server", {
			files: [
				new AttachmentBuilder(Buffer.from(generateError(error), "utf-8"), "error.json"),
			],
		});
	} catch (errorError) {
		console.error(errorError);
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
