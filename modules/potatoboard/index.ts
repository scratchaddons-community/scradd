import { ApplicationCommandOptionType } from "discord.js";
import defineCommand from "../../commands.js";
import { BOARD_EMOJI } from "./board.js";
import { defineButton } from "../../components.js";
import makeSlideshow, { defaultMinReactions } from "./explore.js";

defineCommand(
	{
		name: "explore-potatoes",
		description: `Replies with a random message that has ${BOARD_EMOJI} reactions`,

		options: {
			"channel": {
				description: "Filter messages to only get those in a certain channel",
				type: ApplicationCommandOptionType.Channel,
			},

			"minimum-reactions": {
				description: `Filter messages to only get those with at least this many reactions (defaults to ${defaultMinReactions})`,
				minValue: 1,
				type: ApplicationCommandOptionType.Integer,
			},

			"user": {
				description: "Filter messages to only get those by a certain user",
				type: ApplicationCommandOptionType.User,
			},
		},
	},

	async (interaction) => {
		const minReactions = interaction.options.getInteger("minimum-reactions") ?? undefined;
		const user = interaction.options.getUser("user")?.id;
		const channel = interaction.options.getChannel("channel") ?? undefined;
		await makeSlideshow(interaction, { minReactions, user, channel });
	},
);
defineButton("explorePotatoes", async (interaction, userId) => {
	await makeSlideshow(interaction, { user: userId });
});
