import {
	Collection,
	ButtonStyle,
	ComponentType,
	Snowflake,
	CommandInteraction,
	MessageComponentInteraction,
	ModalSubmitInteraction,
} from "discord.js";

import CONSTANTS from "./CONSTANTS.js";

export const CURRENTLY_PLAYING = new Collection<Snowflake, string>();

/**
 * Reply to the interaction if the interaction user is already playing a game.
 *
 * @param interaction - The interaction to analyze.
 *
 * @returns Whether or not the user is already playing.
 */
export async function checkIfUserPlaying(
	interaction: CommandInteraction | MessageComponentInteraction | ModalSubmitInteraction,
): Promise<boolean> {
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
