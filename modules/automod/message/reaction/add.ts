
import censor, { badWordsAllowed } from "../../language.js";
import CONSTANTS from "../../../../common/CONSTANTS.js";
import warn from "../../../punishments/punishments.js";

import type Event from "../../../../common/types/event";

const event: Event<"messageReactionAdd"> = async function event(partialReaction, partialUser) {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (!message.inGuild() || message.guild.id !== CONSTANTS.guild.id) return;

	const user = partialUser.partial ? await partialUser.fetch() : partialUser;

	const { emoji } = reaction;

	if (emoji.name && !badWordsAllowed(message.channel)) {
		const censored = censor(emoji.name);
		if (censored) {
			await warn(
				user,
				"Watch your language!",
				censored.strikes,
				`Reacted with:\n:${emoji.name}:`,
			);
			await reaction.remove();
			return;
		}
	}
};
export default event;
