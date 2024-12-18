import type { CommandInteractionOption } from "discord.js";

import {
	ApplicationCommandOptionType,
	AutoModerationRuleTriggerType,
	GuildMember,
	MessageMentions,
	MessageType,
	underline,
} from "discord.js";
import { commands, defineChatCommand, defineEvent, escapeAllMarkdown } from "strife.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";
import { joinWithAnd } from "../../util/text.ts";
import { ignoredDeletions } from "../logging/messages.ts";
import warn from "../punishments/warn.ts";
import automodMessage from "./automod.ts";
import tryCensor, { badWordsAllowed } from "./misc.ts";

defineEvent.pre("interactionCreate", async (interaction) => {
	if (
		!interaction.inGuild() ||
		interaction.guild?.id !== config.guild.id ||
		!interaction.isChatInputCommand()
	)
		return true;

	if (!interaction.command) throw new ReferenceError("Unknown command run");

	const command =
		commands[interaction.command.name]?.find(
			(command) =>
				typeof command.access === "boolean" ||
				!![command.access].flat().includes(interaction.guild?.id),
		) ?? commands[interaction.command.name]?.[0];
	if (!command) throw new ReferenceError(`Command \`${interaction.command.name}\` not found`);

	if (command.censored === "channel" ? badWordsAllowed(interaction.channel) : !command.censored)
		return true;

	const censored = censorOptions(interaction.options.data);

	if (censored.strikes) {
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Please ${
				censored.strikes < 1 ? "don’t say that here" : "watch your language"
			}!`,
		});
		await warn(
			interaction.user,
			censored.words.length === 1 ? "Used a banned word" : "Used banned words",
			censored.strikes,
			`Used command \`${interaction.toString()}\``,
		);
		return false;
	}

	return true;
});
defineEvent.pre("messageCreate", async (message) => {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage)
		return false;

	if (message.guild?.id === config.guild.id) return await automodMessage(message);
	return true;
});
defineEvent("messageUpdate", async (_, message) => {
	if (message.partial) return;
	if (
		!message.flags.has("Ephemeral") &&
		message.type !== MessageType.ThreadStarterMessage &&
		message.guild?.id === config.guild.id
	)
		return await automodMessage(message);
	return true;
});
defineEvent.pre("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
	if (message.guild?.id !== config.guild.id) return true;

	if (reaction.emoji.name && !badWordsAllowed(message.channel)) {
		const censored = tryCensor(reaction.emoji.name, 1);
		if (censored) {
			await warn(
				partialUser.partial ? await partialUser.fetch() : partialUser,
				"Reacted with a banned emoji",
				censored.strikes,
				`:${reaction.emoji.name}:`,
			);
			await reaction.remove();
			return false;
		}
	}
	return true;
});
defineEvent.pre("threadCreate", async (thread, newlyCreated) => {
	if (!newlyCreated) return false;
	if (thread.guild.id !== config.guild.id) return true;

	const censored = tryCensor(thread.name);
	if (censored && !badWordsAllowed(thread)) {
		await thread.delete("Bad words");
		return false;
	}
	return true;
});
defineEvent("threadUpdate", async (oldThread, newThread) => {
	if (newThread.guild.id !== config.guild.id) return;

	const censored = tryCensor(newThread.name);
	if (censored && !badWordsAllowed(newThread)) {
		await newThread.setName(oldThread.name, "Censored bad word");
	}
});

defineChatCommand(
	{
		name: "is-bad-word",
		description: "Check text for banned language",

		options: {
			text: {
				type: ApplicationCommandOptionType.String,
				description: "Text to check",
				required: true,
			},
		},

		censored: false,
	},

	async (interaction, options) => {
		const result = tryCensor(options.text);
		if (!result)
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.yes} No bad words found.`,
			});

		const words = result.words.flat();
		const strikes = Math.trunc(result.strikes);

		const isMod =
			interaction.member instanceof GuildMember ?
				interaction.member.roles.resolve(config.roles.staff.id)
			:	interaction.member.roles.includes(config.roles.staff.id);

		await interaction.reply({
			ephemeral: true,

			content:
				`## ⚠️ ${words.length} bad word${words.length === 1 ? "s" : ""} detected!\n` +
				(isMod ?
					`That text gives **${strikes} strike${strikes === 1 ? "" : "s"}**.\n\n`
				:	"") +
				`*I detected the following words as bad*: ${joinWithAnd(words, (word) =>
					underline(escapeAllMarkdown(word)),
				)}`,
		});
	},
);

defineEvent("autoModerationActionExecution", async (action) => {
	if (
		action.guild.id === config.guild.id &&
		action.ruleTriggerType === AutoModerationRuleTriggerType.KeywordPreset &&
		action.alertSystemMessageId &&
		action.action.metadata.channelId &&
		tryCensor(action.content) &&
		!MessageMentions.EveryonePattern.test(action.content)
	) {
		const channel = await config.guild.channels.fetch(action.action.metadata.channelId);
		if (channel?.isTextBased()) {
			ignoredDeletions.add(action.alertSystemMessageId);
			await channel.messages.delete(action.alertSystemMessageId);
		}
	}
});

function censorOptions(options: readonly CommandInteractionOption[]): {
	strikes: number;
	words: string[];
} {
	let strikes = 0;
	const words: string[] = [];

	for (const option of options) {
		const censoredValue =
			(typeof option.value === "string" && tryCensor(option.value)) || undefined;
		const censoredOptions = option.options && censorOptions(option.options);

		strikes += (censoredValue?.strikes ?? 0) + (censoredOptions?.strikes ?? 0);
		words.push(
			...(censoredValue?.words.flat() ?? []),
			...(censoredOptions?.words.flat() ?? []),
		);
	}

	return { strikes, words };
}
