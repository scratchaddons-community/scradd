import { Message, AttachmentBuilder } from "discord.js";
import papaparse from "papaparse";
import fetch from "node-fetch";
import exitHook from "async-exit-hook";
import { getThread } from "./moderation/logging.js";

export const DATABASE_THREAD = "databases";

/**
 * @typedef DatabaseItem
 *
 * @type {{ [key: string]: string | number | boolean }}
 */

/** @param {string} content */
function getDatabaseName(content) {
	return content.split(" ")[1]?.toLowerCase();
}

/** @type {{ [key: string]: Message }} */
const databases = {};

/**
 * @template {string} T
 *
 * @param {T[]} names
 * @param {import("discord.js").Guild} guild
 *
 * @returns {Promise<{
 * 	[value in T]: import("discord.js").Message;
 * }>}
 */
export async function getDatabases(names, guild) {
	const thread = await getThread(DATABASE_THREAD, guild);
	if (!Object.values(databases).length) {
		const messages = await thread.messages.fetch({ limit: 100 });

		for (let message of messages.toJSON()) {
			const name = getDatabaseName(message.content);
			if (name && message.author.id === message.client.user?.id) {
				databases[name] = message;
			}
		}
	}

	return Object.fromEntries(
		await Promise.all(
			names.map(async (name) => {
				return [
					name,
					(databases[name] ||= await thread.send(
						`**__SCRADD ${name.toUpperCase()} DATABASES__**\n\n*Please do not delete this message. If you do, all ${name.toLowerCase()} information will be reset.*`,
					)),
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

/** @type {{ [key: string]: { callback: () => Promise<import("discord.js").Message>; timeout: NodeJS.Timeout } | undefined }} */
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
				new AttachmentBuilder(Buffer.from(papaparse.unparse(content), "utf-8"), {
					name: getDatabaseName(database.content) + ".csv",
				}),
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
