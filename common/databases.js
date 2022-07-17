import { Message, MessageAttachment } from "discord.js";
import papaparse from "papaparse";
import fetch from "node-fetch";
import exitHook from "async-exit-hook";

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

/** @param {string} content */
function getDatabaseName(content) {
	return /SCRADD (?<name>.+) LOG/.exec(content)?.groups?.name?.toLowerCase();
}

/** @type {{ [key: string]: Message }} */
const databases = {};

/**
 * @template {string} T
 *
 * @param {T[]} names
 * @param {import("discord.js").TextBasedChannel} channel
 *
 * @returns {Promise<{ [value in T]: import("discord.js").Message }>}
 */
export async function getDatabases(names, channel) {
	if (!Object.values(databases).length) {
		const pins = await channel.messages.fetchPinned();

		for (let pin of pins.toJSON()) {
			const name = getDatabaseName(pin.content) || "";
			if (name && pin.author.id === pin.client.user?.id) {
				databases[name] = pin;
			}
		}
	}

	return Object.fromEntries(
		await Promise.all(
			names.map(async (name) => {
				return [
					name,
					(databases[name] ||= await channel
						.send({ content: getComment(name) })
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
	if (dataCache[database.id]) return dataCache[database.id] || [];
	const attachment = database?.attachments.first()?.url;

	return (dataCache[database.id] = attachment
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
const dataCache = {};

/**
 * @type {{
 * 	[key: string]:
 * 		| { callback: () => Promise<import("discord.js").Message>; timeout: NodeJS.Timeout }
 * 		| undefined;
 * }}
 */
let timeouts = {};

/**
 * @param {import("discord.js").Message} database
 * @param {DatabaseItem[]} content
 */
export function queueDatabaseWrite(database, content) {
	dataCache[database.id] = content;
	const timeoutId = timeouts[database.id];
	const files = content.length
		? [
				new MessageAttachment(
					Buffer.from(papaparse.unparse(content), "utf-8"),
					getDatabaseName(database.content) + ".csv",
				),
		  ]
		: [];
	const callback = () => {
		const promise = database.edit({ files });
		timeouts[database.id] = undefined;
		return promise;
	};
	timeouts[database.id] = { timeout: setTimeout(callback, 60_000), callback };
	timeoutId && clearTimeout(timeoutId.timeout);
}

export function cleanListeners() {
	return Promise.all(Object.values(timeouts).map((info) => info?.callback()));
}

exitHook((callback) => cleanListeners().then(callback));
