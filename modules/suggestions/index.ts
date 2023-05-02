import { ApplicationCommandOptionType } from "discord.js";
import defineCommand from "../../commands.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import defineEvent from "../../events.js";
import getTop from "./getTop.js";
import { suggestionAnswers, suggestionsDatabase } from "./misc.js";
import updateReactions, { addToDatabase } from "./reactions.js";

defineEvent("threadCreate", async (thread) => {
	if (thread.parent?.id === CONSTANTS.channels.suggestions?.id) addToDatabase(thread);
});
defineEvent("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
	if (message.guild?.id !== CONSTANTS.guild.id) return;

	if (!updateReactions(reaction))
		await message.reactions.resolve(reaction).users.remove(partialUser.id);
});
defineEvent("messageReactionRemove", async (partialReaction) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	if (reaction.message.guild?.id !== CONSTANTS.guild.id) return;

	updateReactions(reaction);
});
defineEvent("threadUpdate", async (_, newThread) => {
	if (newThread.parent?.id === CONSTANTS.channels.suggestions?.id) {
		suggestionsDatabase.updateById({
			id: newThread.id,
			title: newThread.name,

			answer:
				CONSTANTS.channels.suggestions?.availableTags.find(
					(tag): tag is typeof tag & { name: typeof suggestionAnswers[number] } =>
						suggestionAnswers.includes(tag.name) &&
						newThread.appliedTags.includes(tag.id),
				)?.name ?? suggestionAnswers[0],
		});
	}
});
defineEvent("threadDelete", async (thread) => {
	if (thread.parent?.id === CONSTANTS.channels.suggestions?.id)
		suggestionsDatabase.data = suggestionsDatabase.data.filter(({ id }) => id !== thread.id);
});

defineCommand(
	{
		name: "get-top-suggestions",
		description: "Get the top suggestions",

		options: {
			answer: {
				choices: Object.fromEntries(suggestionAnswers.map((answer) => [answer, answer])),
				description: "Filter suggestions to only get those with a certain answer",
				type: ApplicationCommandOptionType.String,
			},

			user: {
				description: "Filter suggestions to only get those by a certain user",
				type: ApplicationCommandOptionType.User,
			},
		},
	},
	getTop,
);
