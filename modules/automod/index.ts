import {
	ActivityType,
	ApplicationCommandOptionType,
	escapeMarkdown,
	GuildMember,
	MessageType,
} from "discord.js";

import CONSTANTS from "../../common/CONSTANTS.js";
import defineCommand from "../../commands.js";
import { joinWithAnd } from "../../util/text.js";
import defineEvent from "../../events.js";
import warn from "../punishments/warn.js";
import {  changeNickname } from "./misc.js";
import automodMessage from "./automod.js";
import censor, { badWordsAllowed } from "./language.js";

defineEvent("messageCreate", async (message) => {
	if (
		!message.flags.has("Ephemeral") &&
		message.type !== MessageType.ThreadStarterMessage &&
		message.guild?.id === CONSTANTS.guild.id
	)
		await automodMessage(message);
});
defineEvent("messageUpdate", async (_, message) => {
	await automodMessage(message.partial ? await message.fetch() : message);
});
defineEvent("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
	if (message.guild?.id !== CONSTANTS.guild.id) return;

	if (reaction.emoji.name && !badWordsAllowed(message.channel)) {
		const censored = censor(reaction.emoji.name);
		if (censored) {
			await warn(
				partialUser.partial ? await partialUser.fetch() : partialUser,
				"Watch your language!",
				censored.strikes,
				`Reacted with:\n:${reaction.emoji.name}:`,
			);
			await reaction.remove();
		}
	}
});
defineEvent("threadCreate", async (thread, newlyCreated) => {
	if (thread.guild.id !== CONSTANTS.guild.id || !newlyCreated) return;

	const censored = censor(thread.name);
	if (censored && !badWordsAllowed(thread)) {
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
});
defineEvent("threadUpdate", async (oldThread, newThread) => {
	if (newThread.guild.id !== CONSTANTS.guild.id) return;

	const censored = censor(newThread.name);
	if (censored && !badWordsAllowed(newThread)) {
		await newThread.setName(oldThread.name, "Censored bad word");
	}
});
defineEvent("userUpdate", async (_, partialUser) => {
	const newUser = partialUser.partial ? await partialUser.fetch() : partialUser;

	const member = await CONSTANTS.guild.members.fetch(newUser.id).catch(() => {});
	if (!member) return;
	await changeNickname(member);
});
defineEvent("presenceUpdate", async (_, newPresence) => {
	if (newPresence.guild?.id !== CONSTANTS.guild.id) return;

	const status =
		newPresence.activities[0]?.type === ActivityType.Custom
			? newPresence.activities[0].state
			: newPresence.activities[0]?.name;
	const censored = status && censor(status);
	if (
		censored &&
		CONSTANTS.roles.mod &&
		newPresence.member?.roles.resolve(CONSTANTS.roles.mod.id)
	) {
		await warn(
			newPresence.member,
			"Watch your language!",
			censored.strikes,
			"Set status to:\n" + status,
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
						CONSTANTS.roles.mod &&
						(interaction.member instanceof GuildMember
							? interaction.member.roles.resolve(CONSTANTS.roles.mod.id)
							: interaction.member.roles.includes(CONSTANTS.roles.mod.id))
							? `That text gives **${Math.trunc(result.strikes)} strike${
									result.strikes === 1 ? "" : "s"
							  }**.\n\n`
							: ""
				  }**I detected the following words as bad**: ${joinWithAnd(
						words,
						(word) => `*${escapeMarkdown(word)}*`,
				  )}`
				: `${CONSTANTS.emojis.statuses.yes} No bad words found.`,
		});
	},
);
