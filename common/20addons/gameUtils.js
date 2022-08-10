import { Collection, MessageActionRow, MessageButton } from "discord.js";

/** @type {Collection<string, import("discord.js").Message>} */
export const CURRENTLY_PLAYING = new Collection();

/**
 * Reply to the interaction if the interaction user is already playing a game.
 *
 * @param {import("discord.js").MessageComponentInteraction | import("discord.js").BaseCommandInteraction} interaction - The interaction to analyze.
 *
 * @returns {Promise<boolean>} Whether or not the user is already playing.
 */
export async function checkIfUserPlaying(interaction) {
	const current = CURRENTLY_PLAYING.get(interaction.user.id);

	if (!current) return false;

	await interaction.reply({
		components: [
			new MessageActionRow().addComponents(
				new MessageButton()
					.setLabel("Go to game")
					.setStyle("LINK")
					.setURL(
						`https://discord.com/channels/${encodeURI(
							current.guild?.id || "@me",
						)}/${encodeURI(current.channel.id)}/${encodeURI(current.id)}`,
					),
			),
		],

		content: `${interaction.user.toString()}, you already have an ongoing game!`,
		ephemeral: true,
		fetchReply: true,
	});

	return true;
}
