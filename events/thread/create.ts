import client from "../../client.js";
import { suggestionAnswers, suggestionsDatabase } from "../../commands/get-top-suggestions.js";
import { badWordsAllowed, censor } from "../../common/automod.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import warn from "../../common/punishments.js";

import type Event from "../../common/types/event";

const event: Event<"threadCreate"> = async function event(thread, newlyCreated) {
	if (thread.guild.id !== CONSTANTS.guild.id || !newlyCreated) return;

	if (thread.parent?.id === CONSTANTS.channels.suggestions?.id) {
		suggestionsDatabase.data = [
			...suggestionsDatabase.data,
			{
				answer: suggestionAnswers[0],
				author: thread.ownerId ?? client.user.id,
				count: 0,
				id: thread.id,
				title: thread.name,
			},
		];
	}

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
};
export default event;
