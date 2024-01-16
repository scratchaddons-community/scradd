import {
	type ChatInputCommandInteraction,
	ComponentType,
	chatInputApplicationCommandMention,
	MessageFlags,
	TextInputStyle,
	type RepliableInteraction,
	type MessageContextMenuCommandInteraction,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import log, { LogSeverity, LoggingEmojis } from "../logging/misc.js";

export default async function sayCommand(
	interaction: ChatInputCommandInteraction | MessageContextMenuCommandInteraction,
	options: { message?: string; reply?: string },
) {
	if (options.message) {
		await say(interaction, options.message, options.reply || undefined);
		return;
	}

	await interaction.showModal({
		title: "Send Message",
		customId: `${options.reply ?? ""}_say`,

		components: [
			{
				type: ComponentType.ActionRow,

				components: [
					{
						type: ComponentType.TextInput,
						customId: "message",
						label: "Message content",
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

/**
 * Mimic something.
 *
 * @param interaction - The interaction that triggered this mimic.
 * @param content - What to mimic.
 */
export async function say(interaction: RepliableInteraction, content: string, reply?: string) {
	await interaction.deferReply({ ephemeral: true });
	const silent = content.startsWith("@silent");
	content = silent ? content.replace("@silent", "").trim() : content;
	const noPing = reply?.startsWith("-");
	reply = noPing ? reply?.replace("-", "") : reply;
	const oldMessage =
		reply && (await interaction.channel?.messages.fetch(reply).catch(() => void 0));
	if (reply && !oldMessage)
		return await interaction.editReply(
			`${constants.emojis.statuses.no} Could not find message to reply to!`,
		);

	const message = await (oldMessage
		? oldMessage.reply({
				content,
				flags: silent ? MessageFlags.SuppressNotifications : undefined,
				allowedMentions: { repliedUser: !noPing },
		  })
		: interaction.channel?.send({
				content,
				flags: silent ? MessageFlags.SuppressNotifications : undefined,
		  }));

	if (message) {
		await log(
			`${LoggingEmojis.Bot} ${chatInputApplicationCommandMention(
				"say",
				(await interaction.guild?.commands.fetch())?.find(({ name }) => name === "say")
					?.id ?? "0",
			)} used by ${interaction.user.toString()} in ${message.channel.toString()} (ID: ${
				message.id
			})`,
			(interaction.guild?.id !== config.guild.id &&
				interaction.guild?.publicUpdatesChannel) ||
				LogSeverity.ServerChange,
			{ buttons: [{ label: "Message", url: message.url }] },
		);
		await interaction.editReply(`${constants.emojis.statuses.yes} Message sent!`);
	}
}
