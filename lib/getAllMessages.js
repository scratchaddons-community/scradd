/**
 * Taken from https://github.com/iColtz/discord-fetch-all/blob/main/src/functions/fetchMessages.ts
 * and adjusted for JSDoc and Discord.JS v13.
 *
 * @param {import("discord.js").TextBasedChannel} channel
 */
export default async function getAllMessages(channel) {
	/** @type {import("discord.js").Message[]} */
	const messages = [];
	/** @type {string | undefined} */
	let lastID;
	do {
		const fetchedMessages = await channel.messages.fetch({
			limit: 100,
			before: lastID,
		});

		messages.push(...Array.from(fetchedMessages.values()));
		lastID = fetchedMessages.lastKey();
	} while (lastID);

	return messages;
}
