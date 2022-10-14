import { Collection, ButtonStyle, ComponentType } from "discord.js";
import CONSTANTS from "./CONSTANTS.js";

/** @type {Collection<import("discord.js").Snowflake, string>} */
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
			{
				type: ComponentType.ActionRow,
				components: [
					{
						label: "Go to game",
						style: ButtonStyle.Link,
						type: ComponentType.Button,
						url: current,
					},
				],
			},
		],

		content: `${CONSTANTS.emojis.statuses.no} You already have an ongoing game!`,
		ephemeral: true,
	});

	return true;
}
