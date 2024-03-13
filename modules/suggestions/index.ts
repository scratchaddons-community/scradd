import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	AuditLogEvent,
	Colors,
	ForumChannel,
	MessageType,
	ThreadChannel,
	type Snowflake,
} from "discord.js";
import { client, defineButton, defineChatCommand, defineEvent, defineMenuCommand } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { formatAnyEmoji, stripMarkdown } from "../../util/markdown.js";
import { lerpColors } from "../../util/numbers.js";
import { truncateText } from "../../util/text.js";
import { ignoredDeletions } from "../logging/messages.js";
import type { AuditLog } from "../logging/misc.js";
import { getAnswer, suggestionAnswers, suggestionsDatabase } from "./misc.js";
import updateReactions, { addToDatabase } from "./reactions.js";
import top from "./top.js";

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
defineEvent("guildAuditLogEntryCreate", async (rawEntry) => {
	if (rawEntry.action !== AuditLogEvent.ThreadUpdate) return;
	const entry = rawEntry as AuditLog<AuditLogEvent.ThreadUpdate, "applied_tags">;

	if (
		!(entry.target instanceof ThreadChannel) ||
		!(entry.target.parent instanceof ForumChannel) ||
		![config.channels.suggestions?.id, config.channels.bugs?.id].includes(
			entry.target.parent.id,
		)
	)
		return;

	const changes = entry.changes.filter(
		(change): change is { key: "applied_tags"; old: Snowflake[]; new: Snowflake[] } =>
			change.key === "applied_tags",
	);
	if (!changes.length) return;

	const oldAnswer = getAnswer(changes[0]?.old ?? [], entry.target.parent);
	const newAnswer = getAnswer(changes.at(-1)?.new ?? [], entry.target.parent);
	if (oldAnswer.name === newAnswer.name) return;

	const user =
		entry.executor &&
		(await config.guild.members.fetch(entry.executor.id).catch(() => entry.executor));

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
					(newAnswer.emoji ? `${formatAnyEmoji(newAnswer.emoji)} ` : "") + newAnswer.name,
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
				description: "Only get suggestions with this answer",
				type: ApplicationCommandOptionType.String,
			},

			user: {
				description: "Only get suggestions posted by this user",
				type: ApplicationCommandOptionType.User,
			},

			all: {
				description:
					"Include denied and invalid suggestions from the archive alongside accepted ones (defaults to false)",
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

const pinnedMessages = new Set<Snowflake>();
defineMenuCommand(
	{ name: "Pin Message", type: ApplicationCommandType.Message, restricted: true },
	async (interaction) => {
		if (!interaction.targetMessage.pinnable)
			return await interaction.reply(
				`${constants.emojis.statuses.no} That message can’t be pinned!`,
			);

		if (interaction.targetMessage.pinned) {
			await interaction.targetMessage.unpin(`Unpinned by ${interaction.user.toString()}`);
			await interaction.reply(
				`${constants.emojis.statuses.yes} Unpinned [message](<${interaction.targetMessage.url}>)!`,
			);
		} else {
			await interaction.targetMessage.pin(`Pinned by ${interaction.user.toString()}`);
			await interaction.reply(
				`${constants.emojis.statuses.yes} Pinned [message](<${interaction.targetMessage.url}>)!`,
			);
			pinnedMessages.add(interaction.targetMessage.id);
		}
	},
);
defineEvent("messageCreate", async (message) => {
	if (
		message.type === MessageType.ChannelPinnedMessage &&
		message.reference?.messageId &&
		pinnedMessages.has(message.reference.messageId)
	) {
		ignoredDeletions.add(message.id);
		await message.delete();
	}
});

defineEvent("messageCreate", async (message) => {
	if (message.channel.id === config.channels.updates?.id) {
		await message.startThread({
			name: truncateText(stripMarkdown(message.cleanContent) || "New update!", 50),

			reason: "New upcoming update",
		});
	}
});
