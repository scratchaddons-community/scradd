import asyncFilter from "./asyncFilter.js";

/**
 * Taken from https://github.com/iColtz/discord-fetch-all/blob/main/src/functions/fetchMessages.ts
 * and adjusted for JSDoc and Discord.JS v13.
 *
 * @param {import("discord.js").TextBasedChannel} channel
 * @param {(
 * 	value: import("discord.js").Message,
 * 	index: number,
 * 	array: import("discord.js").Message[],
 * ) => boolean | Promise<boolean>} [filter]
 */
export default async function getAllMessages(channel, filter = () => true) {
	/** @type {import("discord.js").Message[]} */
	const messages = [];
	/** @type {string | undefined} */
	let lastID;
	do {
		const fetchedMessages = await channel.messages.fetch({
			limit: 100,
			...(lastID && { before: lastID }),
		});
		messages.push(...(await asyncFilter([...fetchedMessages.values()], filter)));
		lastID = fetchedMessages.lastKey();
	} while (lastID);

	return messages;
}
