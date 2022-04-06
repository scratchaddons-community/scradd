/**
 * @file Enables Error reporting.
 *
 * @type {import("../types/event").default<"guildMemberAdd">}
 */
const event = {
	async event(member) {
		const channel = await member.client.channels.fetch(process.env.PUBLIC_LOGS_CHANNEL || "");
		if (!channel?.isText()) return;
		await channel.send({
			content: `Welcome, ${member.toString()}!`,
		});
	},
};

export default event;
