import {
	type ModalSubmitInteraction,
	type ChatInputCommandInteraction,
	ComponentType,
	chatInputApplicationCommandMention,
	MessageFlags,
	TextInputStyle,
} from "discord.js";

import config from "../../common/config.js";
import constants from "../../common/constants.js";
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
			`${LoggingEmojis.Bot} ${chatInputApplicationCommandMention(
				"say",
				(await config.guild.commands.fetch()).find(({ name }) => name === "say")?.id ?? "",
			)} used by ${interaction.user.toString()} in ${message.channel.toString()}`,
			"messages",
			{ button: { label: "View Message", url: message.url } },
		);
		await interaction.reply({
			content: `${constants.emojis.statuses.yes} Message sent!`,
			ephemeral: true,
		});
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
		title: `Send Message`,
		customId: "_say",

		components: [
			{
				type: ComponentType.ActionRow,

				components: [
					{
						type: ComponentType.TextInput,
						customId: "message",
						label: "Message Content",
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
