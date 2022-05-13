/**
 * @param {import("discord.js").Guild} guild
 * @param {string} content
 * @param {"server" | "messages"} group
 * @param {{ files?; embeds? }} [extra]
 */
export default async function log(guild, content, group, extra) {
	const channel = await guild.channels.fetch(process.env.LOGS_CHANNEL || "");
	if (!channel?.isText()) throw new TypeError("Channel is not a text channel");
	const threads = await channel.threads.fetchActive();
	const thread =
		threads.threads.find((thread) => thread.name === group) ||
		(await channel.threads.create({ name: group, autoArchiveDuration: "MAX" }));
	await thread.send({ ...extra, content, allowedMentions: { users: [] } });
}
