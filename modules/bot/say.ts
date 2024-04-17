import {
	ComponentType,
	MessageFlags,
	TextInputStyle,
	type ChatInputCommandInteraction,
	type Message,
	type MessageContextMenuCommandInteraction,
	type RepliableInteraction,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { getBaseChannel, mentionChatCommand } from "../../util/discord.js";
import log, { LogSeverity, LoggingEmojis } from "../logging/misc.js";
import { chatThread } from "../auto/chat.js";
import { client } from "strife.js";

export default async function sayCommand(
	interaction:
		| ChatInputCommandInteraction<"cached" | "raw">
		| MessageContextMenuCommandInteraction<"cached" | "raw">,
	options: { message?: string; reply?: string },
): Promise<void> {
	if (
		chatThread?.id === interaction.channel?.id ||
		config.channels.board?.id === interaction.channel?.id ||
		config.channels.modlogs.id === getBaseChannel(interaction.channel)?.id ||
		!interaction.channel?.permissionsFor(client.user)?.has("SendMessages")
	) {
		await interaction.reply({
			content: `${constants.emojis.statuses.no} Can not send messages in this channel!`,
			ephemeral: true,
		});
		return;
	}

	if (options.message) {
		await say(interaction, options.message, options.reply || undefined);
		return;
	}

	await interaction.channel.sendTyping();
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
	return;
}

/**
 * Mimic something.
 *
 * @param interaction - The interaction that triggered this mimic.
 * @param content - What to mimic.
 */
export async function say(
	interaction: RepliableInteraction,
	content: string,
	reply?: string,
): Promise<Message | undefined> {
	await interaction.deferReply({ ephemeral: true });
	const silent = content.startsWith("@silent");
	content = silent ? content.replace("@silent", "").trim() : content;
	const oldMessage =
		reply && (await interaction.channel?.messages.fetch(reply).catch(() => void 0));
	if (reply && !oldMessage)
		return await interaction.editReply(
			`${constants.emojis.statuses.no} Could not find message to reply to!`,
		);

	const message = await (oldMessage ?
		oldMessage.reply({
			content,
			flags: silent ? MessageFlags.SuppressNotifications : undefined,
		})
	:	interaction.channel?.send({
			content,
			flags: silent ? MessageFlags.SuppressNotifications : undefined,
		}));

	if (message) {
		await log(
			`${LoggingEmojis.Bot} ${await mentionChatCommand(
				"say",
				interaction.guild ?? undefined,
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
