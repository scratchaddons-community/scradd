import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	AuditLogEvent,
	ThreadChannel,
	type Snowflake,
	ForumChannel,
	Colors,
	formatEmoji,
} from "discord.js";
import { client, defineButton, defineChatCommand, defineEvent, defineMenuCommand } from "strife.js";
import config from "../../common/config.js";
import top from "./top.js";
import { getAnswer, suggestionAnswers, suggestionsDatabase } from "./misc.js";
import updateReactions, { addToDatabase } from "./reactions.js";
import { lerpColors } from "../../util/numbers.js";

defineEvent("threadCreate", addToDatabase);
defineEvent("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (!(await updateReactions(reaction)))
		await message.reactions.resolve(reaction).users.remove(partialUser.id);
});
defineEvent("messageReactionRemove", async (partialReaction) => {
	await updateReactions(
		partialReaction.partial ? await partialReaction.fetch() : partialReaction,
	);
});
defineEvent("threadUpdate", async (_, newThread) => {
	if (!config.channels.suggestions || newThread.parent?.id !== config.channels.suggestions.id)
		return;
	if (newThread.locked) {
		suggestionsDatabase.data = suggestionsDatabase.data.filter(({ id }) => id !== newThread.id);
		return;
	}

	const defaultEmoji = config.channels.suggestions.defaultReactionEmoji;
	const message = await newThread.fetchStarterMessage().catch(() => void 0);
	const count = (defaultEmoji?.id && message?.reactions.resolve(defaultEmoji.id)?.count) || 0;

	suggestionsDatabase.updateById(
		{
			id: newThread.id,
			title: newThread.name,
			answer: getAnswer(newThread.appliedTags, config.channels.suggestions).name,
			count,
		},
		{ author: newThread.ownerId ?? client.user.id },
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
		(await config.guild.members.fetch(entry.executor?.id ?? "").catch(() => void 0)) ??
		entry.executor;

	await entry.target.send({
		embeds: [
			{
				author: user
					? { icon_url: user.displayAvatarURL(), name: "Answered by " + user.displayName }
					: undefined,
				color:
					newAnswer.position < 0
						? undefined
						: lerpColors(
								[Colors.Green, Colors.Blue, Colors.Yellow, Colors.Red],
								newAnswer.position,
						  ),
				title:
					(newAnswer.emoji
						? (newAnswer.emoji.id
								? formatEmoji(newAnswer.emoji.id)
								: newAnswer.emoji.name) + " "
						: "") + newAnswer.name,
				description: entry.target.parent.topic
					?.split(`\n- **${newAnswer.name}**: `)[1]
					?.split("\n")[0],
				footer: { text: `Was previously ${oldAnswer.name}` },
			},
		],
	});
});
defineEvent("threadDelete", (thread) => {
	if (thread.parent?.id === config.channels.suggestions?.id)
		suggestionsDatabase.data = suggestionsDatabase.data.filter(({ id }) => id !== thread.id);
});

defineChatCommand(
	{
		name: "top-suggestions",
		description: "List the top suggestions",
		access: true,

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

			all: {
				description:
					"Include denied suggestions from the archive alongside accepted ones (defaults to false)",
				type: ApplicationCommandOptionType.Boolean,
			},
		},
	},
	top,
);
defineMenuCommand(
	{ name: "List Suggestions", type: ApplicationCommandType.User, access: true },
	async (interaction) => {
		await top(interaction, { user: interaction.targetUser });
	},
);
defineButton("suggestions", async (interaction, userId) => {
	await top(interaction, { user: await client.users.fetch(userId) });
});
