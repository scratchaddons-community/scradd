import type { Snowflake } from "discord.js";

import { ApplicationCommandOptionType, ApplicationCommandType, MessageType } from "discord.js";
import {
	client,
	defineButton,
	defineChatCommand,
	defineEvent,
	defineMenuCommand,
	stripMarkdown,
} from "strife.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";
import { truncateText } from "../../util/text.ts";
import { ignoredDeletions } from "../logging/messages.ts";
import answerSuggestion from "./answer.ts";
import { sendDuplicates } from "./duplicates.ts";
import { suggestionAnswers, suggestionsDatabase } from "./misc.ts";
import top from "./top.ts";
import updateReactions, { addToDatabase, updateSuggestion } from "./update.ts";

defineEvent("threadCreate", addToDatabase);
defineEvent("messageReactionAdd", async (partialReaction, { id: user }) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	if (!(await updateReactions(reaction))) await reaction.users.remove(user);
});
defineEvent("messageReactionRemove", async (partialReaction) => {
	await updateReactions(
		partialReaction.partial ? await partialReaction.fetch() : partialReaction,
	);
});
defineEvent("threadUpdate", updateSuggestion);
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

defineEvent("guildAuditLogEntryCreate", answerSuggestion);

defineEvent("messageCreate", sendDuplicates);

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
	if (message.system || message.channel.id !== config.channels.updates?.id) return;
	await message.startThread({
		name: truncateText(stripMarkdown(message.cleanContent) || "New update!", 50),
		reason: "New upcoming update",
	});
});
