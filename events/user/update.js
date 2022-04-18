import CONSTANTS from "../../common/CONSTANTS.js";
import { censor, warn } from "../../common/mod.js";

/** @type {import("../../types/event").default<"userUpdate">} */
const event = {
	async event(_, newUser) {
		if (newUser.partial) newUser = await newUser.fetch();
		const guild = await newUser.client.guilds.fetch(process.env.GUILD_ID || "");

		const member = await guild.members.fetch(newUser.id).catch(() => {});
		if (!member || member.nickname) return;
		const censored = censor(member.displayName);
		if (censored) {
			const modLog = guild.publicUpdatesChannel;
			if (!modLog) throw new TypeError("Could not find mod log");
			await (member.moderatable
				? member.setNickname(censored.censored)
				: modLog.send({
						allowedMentions: { users: [] },
						content: `Missing permissions to change ${member.toString()}'s nickname to \`${
							censored.censored
						}\`.`,
				  }));

			await member
				.send({
					content:
						CONSTANTS.emojis.statuses.no +
						" I censored some bad words in your username. If you change your nickname to include bad words, you may be warned.",
				})
				.catch(() => {});
		}
	},
};

export default event;
