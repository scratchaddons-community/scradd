import asyncFilter from "./asyncFilter.js";

/** @type {{ [key: string]: import("discord.js").Message[] }} */
const CACHE = {};

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
export default async function getAllMessages(channel, filter) {
	/** @type {(import("discord.js").Message[] | Promise<import("discord.js").Message[]>)[]} */
	const messages = [];
	const unfiltered = CACHE[channel.id] || [];
	let lastID = unfiltered[0]?.id;
	if (lastID) {
		messages.push((filter ? asyncFilter(unfiltered, filter) : unfiltered));
		do {
			const fetchedMessages = await channel.messages.fetch({
				limit: 100,
				after: lastID,
			});
			const messagesArray = fetchedMessages.map((value) => value); //.reverse();
			unfiltered.push(...messagesArray);
			messages.push(filter ? asyncFilter(messagesArray, filter) : messagesArray);
			lastID = fetchedMessages.firstKey();
		} while (lastID);
	} else {
		do {
			const fetchedMessages = await channel.messages.fetch({
				limit: 100,
				before: lastID,
			});
			const messagesArray = fetchedMessages.map((value) => value); //.reverse();
			unfiltered.push(...messagesArray);
			messages.push(filter ? asyncFilter(messagesArray, filter) : messagesArray);
			lastID = fetchedMessages.lastKey();
		} while (lastID);
	}

	CACHE[channel.id] = unfiltered;
	return (await Promise.all(messages)).flat();
}
