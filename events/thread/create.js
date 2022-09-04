import warn from "../../common/moderation/warns.js";
import { badWordsAllowed, censor } from "../../common/moderation/automod.js";

/** @type {import("../../common/types/event").default<"threadCreate">} */
export default async function event(thread, newlyCreated) {
	if (thread.guild.id !== process.env.GUILD_ID || badWordsAllowed(thread) || !newlyCreated)
		return;
	const censored = censor(thread.name);
	if (censored) {
		await thread.setName(censored.censored.replaceAll(/#+/g, "x"));

		const owner = await thread.fetchOwner();
		if (owner?.guildMember) {
			await thread.send(owner.toString() + ", language!");
			await warn(
				owner.guildMember,
				`Watch your language!`,
				censored.strikes,
				"Made thread titled:\n" + thread.name,
			);
		}
	}
}
