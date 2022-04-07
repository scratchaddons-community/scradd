import { closeModmail, getThreadFromMember } from "../../../common/modmail.js";

/**
 * @file Enables Error reporting.
 *
 * @type {import("../../../types/event").default<"guildMemberAdd">}
 */
const event = {
	async event(member) {
		const channel = await member.client.channels.fetch(process.env.PUBLIC_LOGS_CHANNEL || "");
		if (!channel?.isText()) throw new Error("PUBLIC_LOGS_CHANNEL is not a text channel.");
		await Promise.all([
			channel.send({
				content: `Welp... goodbye, ${member.toString()}!`,
			}),
			getThreadFromMember(member).then(async (thread) => {
				console.log(thread);
				if (thread) closeModmail(thread, member.user);
			}),
		]);
	},
};

export default event;
