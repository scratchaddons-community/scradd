import { Collection, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageActionRowBuilder } from "../types/ActionRowBuilder.js";

/** @type {Collection<string, string>} */
export const CURRENTLY_PLAYING = new Collection();

/**
 * Reply to the interaction if the interaction user is already playing a game.
 *
 * @param {| import("discord.js").CommandInteraction
 * 	| import("discord.js").MessageComponentInteraction
 * 	| import("discord.js").ModalSubmitInteraction} interaction
 *   - The interaction to analyze.
 *
 *
 * @returns {Promise<boolean>} Whether or not the user is already playing.
 */
export async function checkIfUserPlaying(interaction) {
	const current = CURRENTLY_PLAYING.get(interaction.user.id);

	if (!current) return false;

	await interaction.reply({
		components: [
			new MessageActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setLabel("Go to game")
					.setStyle(ButtonStyle.Link)
					.setURL(current),
			),
		],

		content: `${interaction.user.toString()}, you already have an ongoing game!`,
		ephemeral: true,
		fetchReply: true,
	});

	return true;
}
