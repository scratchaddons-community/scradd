import { ApplicationCommandOptionType } from "discord.js";
import { client, defineChatCommand, defineEvent } from "strife.js";
import config from "../../common/config.js";
import top from "./top.js";
import { suggestionAnswers, suggestionsDatabase } from "./misc.js";
import updateReactions, { addToDatabase } from "./reactions.js";

defineEvent("threadCreate", (thread) => {
	if (thread.parent?.id === config.channels.suggestions?.id) addToDatabase(thread);
});
defineEvent("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (!(await updateReactions(reaction)))
		await message.reactions.resolve(reaction).users.remove(partialUser.id);
});
defineEvent("messageReactionRemove", async (partialReaction) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	if (reaction.message.guild?.id !== config.guild.id) return;

	await updateReactions(reaction);
});
defineEvent("threadUpdate", (_, newThread) => {
	if (newThread.parent?.id !== config.channels.suggestions?.id) return;
	if (newThread.locked) {
		suggestionsDatabase.data = suggestionsDatabase.data.filter(({ id }) => id !== newThread.id);
		return;
	}
	suggestionsDatabase.updateById(
		{
			id: newThread.id,
			title: newThread.name,

			answer:
				config.channels.suggestions?.availableTags.find(
					(tag) =>
						suggestionAnswers.includes(tag.name) &&
						newThread.appliedTags.includes(tag.id),
				)?.name ?? suggestionAnswers[0],
		},
		{ author: newThread.ownerId ?? client.user.id, count: 0 },
	);
});
defineEvent("threadDelete", (thread) => {
	if (thread.parent?.id === config.channels.suggestions?.id)
		suggestionsDatabase.data = suggestionsDatabase.data.filter(({ id }) => id !== thread.id);
});

defineChatCommand(
	{
		name: "top-suggestions",
		description: "List the top suggestions",

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
	top,
);
