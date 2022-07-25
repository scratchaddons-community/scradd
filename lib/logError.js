import { Client, MessageAttachment } from "discord.js";
import escapeMessage from "./escape.js";

/**
 * @param {unknown} error
 * @param {string} event
 * @param {Client} client
 */
export default async function logError(error, event, client) {
	try {
		console.error(error);
		const guild = await client.guilds.fetch(process.env.GUILD_ID || "");

		const { channels } = await guild.fetch();
		const { ERROR_CHANNEL } = process.env;

		if (!ERROR_CHANNEL) throw new ReferenceError("ERROR_CHANNEL is not set in the .env");

		const channel = await channels.fetch(ERROR_CHANNEL);

		if (!channel?.isText()) throw new ReferenceError("Could not find error reporting channel");

		return await channel?.send({
			content: `Error occurred in **${escapeMessage(event)}**!`,
			files: [
				new MessageAttachment(Buffer.from(generateError(error), "utf-8"), "error.json"),
			],
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
							stack: error.stack.split("\n"),
							...error,
					  }
					: { ...error },
				undefined,
				"  ",
		  )
		: error.toString();
};
