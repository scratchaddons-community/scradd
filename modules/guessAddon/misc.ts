import {
	ButtonStyle,
	chatInputApplicationCommandMention,
	Collection,
	CommandInteraction,
	ComponentType,
	MessageComponentInteraction,
	ModalSubmitInteraction,
	type Snowflake,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";

export const COLLECTOR_TIME = constants.collectorTime * 4;

export const commandMarkdown = `\n\n*Run the ${chatInputApplicationCommandMention(
	"addon",
	(await config.guild.commands.fetch()).find((command) => command.name === "addon")?.id ?? "",
)} command for more information about this addon!*`;

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

		content: `${constants.emojis.statuses.no} You already have an ongoing game!`,
		ephemeral: true,
	});

	return true;
}
