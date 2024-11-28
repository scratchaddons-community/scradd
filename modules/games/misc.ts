import type {
	CommandInteraction,
	MessageComponentInteraction,
	ModalSubmitInteraction,
	Snowflake,
} from "discord.js";

import { ButtonStyle, Collection, ComponentType } from "discord.js";

import constants from "../../common/constants.ts";

export const GAME_COLLECTOR_TIME = constants.collectorTime * 4;

export const CURRENTLY_PLAYING = new Collection<Snowflake, { url: string; end?(): unknown }>();

/**
 * Reply to the interaction if the interaction user is already playing a game.
 *
 * @param interaction - The interaction to analyze.
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
						label: "Game",
						style: ButtonStyle.Link,
						type: ComponentType.Button,
						url: current.url,
					},
					...(current.end ?
						[
							{
								label: "End",
								style: ButtonStyle.Danger,
								type: ComponentType.Button,
								customId: `${interaction.user.id}_endGame`,
							} as const,
						]
					:	[]),
				],
			},
		],

		content: `${constants.emojis.statuses.no} You already have an ongoing game!`,
		ephemeral: true,
	});

	return true;
}
