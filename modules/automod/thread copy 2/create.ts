import censor, { badWordsAllowed } from "../language.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import warn from "../../punishments/punishments.js";

import type Event from "../../../common/types/event";

defineEvent("threadCreate", async (thread, newlyCreated) => {
	if (thread.guild.id !== CONSTANTS.guild.id || !newlyCreated) return;

	if (badWordsAllowed(thread)) return;
	const censored = censor(thread.name);
	if (censored) {
		await thread.setName(censored.censored.replaceAll(/#+/g, "x"), "Censored bad word");

		const owner = await thread.fetchOwner();
		if (owner) {
			await thread.send(`${owner.toString()}, language!`);
			if (owner.guildMember) {
				await warn(
					owner.guildMember,
					"Watch your language!",
					censored.strikes,
					`Made thread titled:\n${thread.name}`,
				);
			}
		}
	}
});
