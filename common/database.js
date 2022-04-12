import { MessageAttachment } from "discord.js";
import papaparse from "papaparse";
import fetch from "node-fetch";

/**
 * @param {string} name
 *
 * @returns {string}
 */
export function getComment(name) {
	return `**__SCRADD ${name.toUpperCase()} LOG__**\n\n*Please do not delete nor unpin this message. If you do, all current ${name}s will be reset.*`;
}

/**
 * @template {string} T
 *
 * @param {T[]} names
 * @param {import("discord.js").TextBasedChannel} channel
 *
 * @returns {Promise<{ [value in T]: import("discord.js").Message }>}
 */
export async function getDatabases(names, channel) {
	const comments = names.map(getComment);
	const pins = await channel.messages.fetchPinned();

	const databases = Object.fromEntries(
		pins
			.map(
				(message) =>
					/** @type {[T, import("discord.js").Message]} */ ([
						names[comments.indexOf(message.content)],
						message,
					]),
			)
			.filter(([a]) => a),
	);

	return Object.fromEntries(
		await Promise.all(
			names.map(async (name) => {
				return [
					name,
					databases[name] ||
						(await channel
							.send({ content: getComment(name) })
							.then((message) => message.pin())),
				];
			}),
		),
	);
}

/**
 * @template {{ [key: string]: any }} T
 *
 * @param {import("discord.js").Message} database
 *
 * @returns {Promise<T[]>}
 */
export async function extractData(database) {
	const attachment = database?.attachments.first()?.url;

	return attachment
		? await fetch(attachment)
				.then((res) => res.text())
				.then(
					(csv) =>
						/** @type {T[]} */
						papaparse.parse(csv.trim(), { dynamicTyping: true, header: true }).data,
				)
		: [];
}

/**
 * @template {{ [key: string]: any }} T
 *
 * @param {import("discord.js").Message} database
 * @param {T[]} content
 *
 * @returns
 */
export async function writeToDatabase(database, content) {
	return await database.edit({
		files: content.length
			? [
					new MessageAttachment(
						Buffer.from(papaparse.unparse(content), "utf-8"),
						/SCRADD (?<name>.+) LOG/
							.exec(database.content)
							?.groups?.name?.toLowerCase() + ".csv",
					),
			  ]
			: [],
	});
}
