import { ApplicationCommandOptionType } from "discord.js";
import defineCommand from "../../lib/commands.js";
import guessAddon from "./guessAddon.js";
import memory, { messageDelete } from "./memory.js";
import { defineButton } from "../../lib/components.js";
import { CURRENTLY_PLAYING } from "./misc.js";
import constants from "../../common/constants.js";
import defineEvent from "../../lib/events.js";
import { disableComponents } from "../../util/discord.js";

defineCommand(
	{ name: "guess-addon", description: "Think of an addon and I will guess it!" },
	guessAddon,
);

defineCommand(
	{
		name: "memory",
		description: "memory",
		options: {
			user: { description: "user", type: ApplicationCommandOptionType.User, required: true },
			mode: {
				description: "difficulty",
				type: ApplicationCommandOptionType.String,
				choices: { Easy: "Easy", Traditional: "Traditional" },
			},
		},
	},
	memory,
);
defineEvent.pre("messageDelete", messageDelete);

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
