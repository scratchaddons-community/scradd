import { MessageAttachment } from "discord.js";
import papaparse from "papaparse";
import fetch from "node-fetch";

/**
 * @typedef DatabaseItem
 *
 * @type {{ [key: string]: string | number | boolean }}
 */

/**
 * @param {string} name
 *
 * @returns {string}
 */
function getComment(name) {
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
					/** @type {const} */ ([names[comments.indexOf(message.content)], message]),
			)
			.filter(([name, message]) => name && message.author.id === message.client.user?.id),
	);

	return Object.fromEntries(
		await Promise.all(
			names.map(async (name, index) => {
				return [
					name,
					databases[name] ||
						(await channel
							.send({ content: comments[index] })
							.then((message) => message.pin())),
				];
			}),
		),
	);
}

/**
 * @param {import("discord.js").Message} database
 *
 * @returns {Promise<DatabaseItem[]>}
 */
export async function extractData(database) {
	if (cache[database.id]) return cache[database.id] || [];
	const attachment = database?.attachments.first()?.url;

	return (cache[database.id] = attachment
		? await fetch(attachment)
				.then((res) => res.text())
				.then(
					(csv) =>
						/** @type {T[]} */
						papaparse.parse(csv.trim(), { dynamicTyping: true, header: true }).data,
				)
		: []);
}

/** @type {{ [key: string]: DatabaseItem[] }} */
const cache = {};

/**
 * @type {{
 * 	[key: string]: { callback: () => Promise<void>; timeout: NodeJS.Timeout } | undefined;
 * }}
 */
let timeouts = {};

/**
 * @param {import("discord.js").Message} database
 * @param {DatabaseItem[]} content
 */
export function queueDatabaseWrite(database, content) {
	cache[database.id] = content;
	const timeoutId = timeouts[database.id];
	const callback = async () => {
		timeouts[database.id] = undefined;
		await database.edit({
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
	};
	timeouts[database.id] = { timeout: setTimeout(callback, 60_000), callback };
	timeoutId && clearTimeout(timeoutId.timeout);
}

export async function cleanListeners() {
	await Promise.all(
		Object.values(timeouts).map(async (info) => {
			console.log(info);
			if (!info) return;
			clearTimeout(info.timeout);
			return await info.callback();
		}),
	);
}
