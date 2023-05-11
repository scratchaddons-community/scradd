import {
	type ModalSubmitInteraction,
	type ChatInputCommandInteraction,
	ComponentType,
	chatInputApplicationCommandMention,
	MessageFlags,
	TextInputStyle,
} from "discord.js";

import CONSTANTS from "../../common/CONSTANTS.js";
import log, { LoggingEmojis } from "../modlogs/misc.js";

/**
 * Mimic something.
 *
 * @param interaction - The interaction that triggered this mimic.
 * @param content - What to mimic.
 */
export async function say(
	interaction: ChatInputCommandInteraction<"cached" | "raw"> | ModalSubmitInteraction,
	content: string,
) {
	const silent = content.startsWith("@silent");
	content = silent ? content.replace("@silent", "").trim() : content;

	const message = await interaction.channel?.send({
		content,
		flags: silent ? MessageFlags.SuppressNotifications : undefined,
	});

	if (message) {
		await log(
			`${
				LoggingEmojis.Bot
			} ${interaction.user.toString()} used ${chatInputApplicationCommandMention(
				"say",
				(await CONSTANTS.guild.commands.fetch()).find(({ name }) => name === "say")?.id ??
					"",
			)} in ${message.channel.toString()}`,
			"messages",
			{ button: { label: "View Message", url: message.url } },
		);
		await interaction.reply({ content: CONSTANTS.emojis.statuses.yes, ephemeral: true });
	}
}

export default async function sayCommand(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
) {
	const content = interaction.options.getString("message");
	if (content) {
		await say(interaction, content);
		return;
	}

	await interaction.showModal({
		title: `Say Message`,
		customId: "_say",

		components: [
			{
				type: ComponentType.ActionRow,

				components: [
					{
						type: ComponentType.TextInput,
						customId: "message",
						label: "Message",
						maxLength: 2000,
						required: true,
						style: TextInputStyle.Paragraph,
					},
				],
			},
		],
	});
	return await interaction.channel?.sendTyping();
}
