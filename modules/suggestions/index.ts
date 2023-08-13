import {
	ApplicationCommandOptionType,
	AuditLogEvent,
	ThreadChannel,
	type Snowflake,
	ForumChannel,
} from "discord.js";
import { client, defineCommand, defineEvent } from "strife.js";
import config from "../../common/config.js";
import getTop from "./getTop.js";
import { getAnswer, suggestionAnswers, suggestionsDatabase } from "./misc.js";
import updateReactions, { addToDatabase } from "./reactions.js";

defineEvent("threadCreate", async (thread) => {
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

	updateReactions(reaction);
});
defineEvent("threadUpdate", async (_, newThread) => {
	if (!config.channels.suggestions || newThread.parent?.id !== config.channels.suggestions?.id)
		return;
	if (newThread.locked) {
		suggestionsDatabase.data = suggestionsDatabase.data.filter(({ id }) => id !== newThread.id);
		return;
	}
	suggestionsDatabase.updateById(
		{
			id: newThread.id,
			title: newThread.name,
			answer: getAnswer(newThread.appliedTags, config.channels.suggestions).name,
		},
		{ author: newThread.ownerId ?? client.user.id, count: 0 },
	);
});
defineEvent("guildAuditLogEntryCreate", async (entry) => {
	if (
		entry.action !== AuditLogEvent.ThreadUpdate ||
		!(entry.target instanceof ThreadChannel) ||
		!(entry.target.parent instanceof ForumChannel) ||
		![config.channels.suggestions?.id, config.channels.bugs?.id].includes(
			entry.target.parent.id,
		)
	)
		return;

	const changes = entry.changes.filter(
		(change): change is typeof change & { old: Snowflake[]; new: Snowflake[] } =>
			(change.key as string) === "applied_tags",
	);
	if (!changes.length) return;

	const oldAnswer = getAnswer(changes[0]?.old ?? [], entry.target.parent);
	const newAnswer = getAnswer(changes.at(-1)?.new ?? [], entry.target.parent);
	if (oldAnswer.name === newAnswer.name) return;

	const user =
		(await config.guild.members.fetch(entry.executor?.id ?? "").catch(() => {})) ??
		entry.executor;

	await entry.target.send({
		embeds: [
			{
				author: user
					? { icon_url: user.displayAvatarURL(), name: "Answered by " + user.displayName }
					: undefined,
				description: entry.target.parent?.topic
					?.split(`\n- **${newAnswer.name}**: `)[1]
					?.split("\n")[0],
				footer: { text: `Was previously ${oldAnswer.name}` },
				title:
					(newAnswer.emoji
						? `${newAnswer.emoji.name || `<:_:${newAnswer.emoji.id}>`} `
						: "") + newAnswer.name,
			},
		],
	});
});
defineEvent("threadDelete", async (thread) => {
	if (thread.parent?.id === config.channels.suggestions?.id)
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
