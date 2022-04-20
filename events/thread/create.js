import { censor, warn } from "../../common/moderation.js";

/** @type {import("../../types/event").default<"threadCreate">} */
const event = {
	async event(thread) {
		if (thread.guild.id !== process.env.GUILD_ID) return;
		const censored = censor(thread.name);
		if (censored) {
			await thread.setName(censored.censored);
			const owner = await thread.fetchOwner();
			if (owner?.guildMember)
				await warn(owner.guildMember, "Watch your language!", censored.strikes);
		}
	},
};

export default event;
