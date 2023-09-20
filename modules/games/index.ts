import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import guessAddon from "./guessAddon.js";
import memoryMatch, { messageDelete, showMemoryInstructions } from "./memoryMatch.js";
import { defineButton, defineChatCommand, defineEvent, defineMenuCommand } from "strife.js";
import { CURRENTLY_PLAYING } from "./misc.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";

defineChatCommand(
	{ name: "guess-addon", description: "Think of an addon for me to guess it", access: true },
	guessAddon,
);

defineChatCommand(
	{
		name: "memory-match",
		description: "Play a memory matching game against someone else",
		options: {
			"user": {
				description: "A user to challenge",
				type: ApplicationCommandOptionType.User,
				required: true,
			},
			"easy-mode": {
				description: "Show 2 matches per emoji (defaults to false)",
				type: ApplicationCommandOptionType.Boolean,
			},
			"thread": {
				description:
					"Whether to create a thread for chatting alongside the game (defaults to true)",
				type: ApplicationCommandOptionType.Boolean,
			},
			"bonus-turns": {
				description: "Give players another turn when they get a match (defaults to true)",
				type: ApplicationCommandOptionType.Boolean,
			},
		},
		access: false,
	},
	memoryMatch,
);
defineMenuCommand(
	{ name: "Play Memory Match", type: ApplicationCommandType.User, access: true },
	async (interaction) => {
		await memoryMatch(interaction, { user: interaction.targetMember ?? undefined });
	},
);
defineEvent.pre("messageDelete", messageDelete);
defineButton("showMemoryInstructions", showMemoryInstructions);

defineButton("endGame", async (interaction, users) => {
	if (!users.split("-").includes(interaction.user.id))
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You can’t end someone else’s game!`,
		});

	await interaction.message.edit({
		components: disableComponents(interaction.message.components),
	});

	const current = CURRENTLY_PLAYING.get(interaction.user.id);
	if (!current)
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You aren’t playing any games currently!`,
		});

	if (!current.end)
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You can’t end this game!`,
		});

	await interaction.deferUpdate();
	return await current.end();
});
