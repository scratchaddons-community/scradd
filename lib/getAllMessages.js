/**
 *
 * @param {import("discord.js").TextBasedChannel} channel
 */
export default async function getAllMessages(channel) {
		/** @type {import("discord.js").Message[]} */
		const all = [];
		let limit = 100;
		let lastFetch = limit;
		/** @type {undefined | string} */
		let lastMessage = undefined;
		while (lastFetch === limit) {
			/** @type {import("discord.js").ChannelLogsQueryOptions} */
			const options = {limit}
			if(lastMessage) options.after = lastMessage;
			const messages = await channel.messages.fetch(options);
			lastFetch = messages.size;
			lastMessage = messages.last()?.id;
			all.push(...messages.values());
		}
	return all
}
