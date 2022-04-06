import { Client, MessageAttachment, MessageEmbed } from "discord.js";
import escapeMessage from "./escape.js";

/**
 * @param {any} error
 * @param {string} event
 * @param {Client} client
 */
export default async function logError(error, event, client) {
	try {
		console.error(error);

		const embed = new MessageEmbed()
			.setTitle("Error!")
			.setDescription(`Uh-oh! I found an error! (event **${escapeMessage(event)}**)`)
			.setColor("LUMINOUS_VIVID_PINK");

		const { ERROR_CHANNEL } = process.env;

		if (!ERROR_CHANNEL) throw new ReferenceError("ERROR_CHANNEL is not set in the .env");

		const testingChannel = await client.channels.fetch(ERROR_CHANNEL);

		if (!testingChannel?.isText())
			throw new ReferenceError("Could not find error reporting channel");

		await testingChannel.send({
			files: [
				new MessageAttachment(Buffer.from(generateError(error), "utf-8"), "error.json"),
			],
			embeds: [embed],
		});
	} catch (errorError) {
		console.error(errorError);
	}
}

/**
 * @param {any} error
 *
 * @returns {string}
 */
const generateError = (error) =>
	!("toString" in error) ||
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
							stack: error.stack,
							...error,
					  }
					: { ...error },
				undefined,
				"\t",
		  )
		: error.toString();
