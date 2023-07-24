import {
	ActivityType,
	ApplicationCommandOptionType,
	escapeMarkdown,
	GuildMember,
	MessageType,
	type CommandInteractionOption,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { joinWithAnd } from "../../util/text.js";
import warn from "../punishments/warn.js";
import changeNickname from "./nicknames.js";
import automodMessage from "./automod.js";
import censor, { badWordsAllowed } from "./language.js";
import { commands, defineCommand, defineEvent } from "strife.js";

defineEvent.pre("interactionCreate", async (interaction) => {
	if (!interaction.inGuild() || !interaction.isChatInputCommand()) return true;

	const command = commands.get(interaction.command?.name ?? "");
	if (!command) throw new ReferenceError(`Command \`${interaction.command?.name}\` not found`);

	if (
		command.censored === "channel"
			? !badWordsAllowed(interaction.channel)
			: command.censored ?? true
	) {
		const censored = censorOptions(interaction.options.data);

		if (censored.strikes) {
			await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Language!`,
			});
			await warn(
				interaction.user,
				"Watch your language!",
				censored.strikes,
				`Used command ${interaction.toString()}`,
			);
			return false;
		}
	}

	return true;

	function censorOptions(options: readonly CommandInteractionOption[]): {
		strikes: number;
		words: string[];
	} {
		let strikes = 0;
		const words: string[] = [];

		for (const option of options) {
			const censoredValue = (option.value === "string" && censor(option.value)) || undefined;
			const censoredOptions = (option.options && censorOptions(option.options)) || undefined;

			strikes += (censoredValue?.strikes ?? 0) + (censoredOptions?.strikes ?? 0);
			words.push(
				...(censoredValue?.words.flat() ?? []),
				...(censoredOptions?.words.flat() ?? []),
			);
		}

		return { strikes, words };
	}
});
defineEvent.pre("messageCreate", async (message) => {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage)
		return false;

	if (message.guild?.id === config.guild.id) return await automodMessage(message);
	return true;
});
defineEvent("messageUpdate", async (_, message) => {
	if (
		!message.flags.has("Ephemeral") &&
		message.type !== MessageType.ThreadStarterMessage &&
		message.guild?.id === config.guild.id
	)
		await automodMessage(message.partial ? await message.fetch() : message);
});
defineEvent.pre("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
	if (message.guild?.id !== config.guild.id) return false;

	if (reaction.emoji.name && !badWordsAllowed(message.channel)) {
		const censored = censor(reaction.emoji.name);
		if (censored) {
			await warn(
				partialUser.partial ? await partialUser.fetch() : partialUser,
				"Watch your language!",
				censored.strikes,
				`Reacted with :${reaction.emoji.name}:`,
			);
			await reaction.remove();
			return false;
		}
	}
	return true;
});
defineEvent.pre("threadCreate", async (thread, newlyCreated) => {
	if (thread.guild.id !== config.guild.id || !newlyCreated) return false;

	const censored = censor(thread.name);
	if (censored && !badWordsAllowed(thread)) {
		await thread.delete("Bad words");
		return false;
	}
	return true;
});
defineEvent("threadUpdate", async (oldThread, newThread) => {
	if (newThread.guild.id !== config.guild.id) return;

	const censored = censor(newThread.name);
	if (censored && !badWordsAllowed(newThread)) {
		await newThread.setName(oldThread.name, "Censored bad word");
	}
});
defineEvent("guildMemberUpdate", async (_, member) => {
	if (member.guild.id !== config.guild.id) return;
	await changeNickname(member);
});
defineEvent("presenceUpdate", async (_, newPresence) => {
	if (newPresence.guild?.id !== config.guild.id) return;

	const status =
		newPresence.activities[0]?.type === ActivityType.Custom
			? newPresence.activities[0].state
			: newPresence.activities[0]?.name;
	const censored = status && censor(status);
	if (censored && config.roles.mod && newPresence.member?.roles.resolve(config.roles.mod.id)) {
		await warn(
			newPresence.member,
			"Watch your language!",
			censored.strikes,
			"Set status to " + status,
		);
	}
});

defineCommand(
	{
		name: "is-bad-word",
		description: "Checks text for language",

		options: {
			text: {
				type: ApplicationCommandOptionType.String,
				description: "Text to check",
				required: true,
			},
		},

		censored: false,
	},

	async (interaction) => {
		const result = censor(interaction.options.getString("text", true));

		const words = result && result.words.flat();
		await interaction.reply({
			ephemeral: true,

			content: words
				? `⚠️ **${words.length} bad word${words.length > 0 ? "s" : ""} detected**!\n${
						config.roles.mod &&
						(interaction.member instanceof GuildMember
							? interaction.member.roles.resolve(config.roles.mod.id)
							: interaction.member.roles.includes(config.roles.mod.id))
							? `That text gives **${Math.trunc(result.strikes)} strike${
									result.strikes === 1 ? "" : "s"
							  }**.\n\n`
							: ""
				  }**I detected the following words as bad**: ${joinWithAnd(
						words,
						(word) => `*${escapeMarkdown(word)}*`,
				  )}`
				: `${constants.emojis.statuses.yes} No bad words found.`,
		});
	},
);
