import { Client, Constants, MessageAttachment } from "discord.js";
import escapeMessage from "./escape.js";
import { Embed } from "@discordjs/builders";

/**
 * @param {any} error
 * @param {string} event
 * @param {Client} client
 */
export default async function logError(error, event, client) {
	try {
		console.error(error);

		const embed = new Embed()
			.setTitle("Error!")
			.setDescription(`Uh-oh! I found an error! (event **${escapeMessage(event)}**)`)
			.setColor(Constants.Colors.LUMINOUS_VIVID_PINK);

		const { LOG_CHANNEL } = process.env;

		const testingChannel = await client.channels.fetch(LOG_CHANNEL || "");

		if (!testingChannel?.isText())
			throw new ReferenceError("Could not find error reporting channel");

		return await testingChannel.send({
			files: [
				new MessageAttachment(Buffer.from(generateError(error), "utf-8"), "error.json"),
			],
			embeds: [embed],
		});
	} catch (errorError) {
		console.error(errorError);
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

/**
 * @param {string} unclean
 *
 * @returns {string}
 */
function sanitizePath(unclean, noDoxx = true) {
	const sanitized = decodeURIComponent(unclean)
		.replaceAll("\\", "/")

		.replaceAll("file:///", "");
	return noDoxx ? sanitized.replaceAll(sanitizePath(process.cwd(), false), ".") : sanitized;
}
