/**
 * Get all messages from a channel.
 *
 * @author Taken From
 *   [discord-fetch-all](https://github.com/iColtz/discord-fetch-all/blob/main/src/functions/fetchMessages.ts)
 *   and adjusted for JSDoc and Discord.JS v13.
 * @file Fetch All messages from a channel.
 *
 * @param {import("discord.js").TextBasedChannel} channel - The channel to fetch messages from.
 *
 * @returns {Promise<import("discord.js").Message[]>} - The messages.
 */
export default async function getAllMessages(channel) {
	/** @type {import("discord.js").Message[]} */
	const messages = [];

	/** @type {string | undefined} */
	// eslint-disable-next-line fp/no-let -- This needs to be changable
	let lastId;

	do {
		// eslint-disable-next-line no-await-in-loop -- We can’t use `Promise.all` here
		const fetchedMessages = await channel.messages.fetch({ before: lastId, limit: 100 });

		messages.push(...Array.from(fetchedMessages.values()));
		lastId = fetchedMessages.lastKey();
	} while (lastId);

	return messages;
}
