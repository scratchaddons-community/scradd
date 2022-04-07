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

		const byes = [
			`Welp… ${member.toString()} decided to leave… what a shame…`,
			`Ahh… ${member.toString()} left us… hope they’ll have safe travels!`,
		];

		await Promise.all([
			channel.send({
				content: byes[Math.floor(Math.random() * byes.length)],
			}),
			getThreadFromMember(member).then(async (thread) => {
				if (thread) closeModmail(thread, member.user);
			}),
		]);
	},
};

export default event;
