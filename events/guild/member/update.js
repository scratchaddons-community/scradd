import { censor, warn } from "../../../common/mod.js";

/** @type {import("../../../types/event").default<"guildMemberUpdate">} */
const event = {
	async event(_, newMember) {
		if (newMember.guild.id !== process.env.GUILD_ID) return;
		const censored = censor(newMember.displayName);
		if (censored) {
			const modLog = newMember.guild.publicUpdatesChannel;
			if (!modLog) throw new TypeError("Could not find mod log");
			await (newMember.moderatable
				? newMember.setNickname(censored.censored)
				: modLog.send({
						allowedMentions: { users: [] },
						content: `Missing permissions to change ${newMember.toString()}'s nickname to \`${
							censored.censored
						}\`.`,
				  }));
			await warn(newMember, "Watch your language!");
		}
	},
};

export default event;
