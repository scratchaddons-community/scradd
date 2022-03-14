/** @file Code To perform operations related to the potatoboard. */
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import extractMessageExtremities from "../lib/extractMessageExtremities.js";

import getAllMessages from "../lib/getAllMessages.js";
import messageToText from "../lib/messageToText.js";

export const BOARD_CHANNEL = process.env.BOARD_CHANNEL || "";
export const BOARD_EMOJI = "🥔";
export const MIN_REACTIONS = process.env.NODE_ENV === "production" ? 6 : 1;

/**
 * Supplied a message in #potatoboard, get the original message that was reacted to.
 *
 * @param {import("discord.js").Message} boardMessage - Message in #potatoboard.
 *
 * @returns {Promise<import("discord.js").Message<boolean> | undefined>} - Source message.
 */
export async function boardMessageToSource(boardMessage) {
	const component = boardMessage?.components[0]?.components?.[0];

	if (component?.type !== "BUTTON") return;

	const { guildId, channelId, messageId } =
		/^https?:\/\/(?:.+\.)?discord\.com\/channels\/(?<guildId>\d+)\/(?<channelId>\d+)\/(?<messageId>\d+)\/?$/iu.exec(
			component.url || "",
		)?.groups || {};

	if (boardMessage.guild?.id !== guildId || !channelId || !messageId) return;

	const channel = await boardMessage.guild?.channels.fetch(channelId).catch(() => {});

	if (!channel?.isText()) return;

	const message = await channel.messages.fetch(messageId);

	if (!message) return;

	return message;
}

/**
 * Supplied a message, get the message in #potatoboard that references it.
 *
 * @param {import("discord.js").Message} message - Message to find.
 *
 * @returns {Promise<import("discord.js").Message<boolean> | undefined>} Message on #potatoboard.
 */
export async function sourceToBoardMessage(message) {
	if (!message.guild) return;

	const board = await message.guild.channels.fetch(BOARD_CHANNEL);

	if (!board?.isText()) {
		throw new ReferenceError("Could not find board channel.");
	}

	const fetchedMessages = await getAllMessages(board);

	return fetchedMessages.find((boardMessage) => {
		const component = boardMessage?.components[0]?.components?.[0];

		if (component?.type !== "BUTTON") return false;

		const messageId = /\d+$/.exec(component.url || "")?.[0];

		return messageId === message.id;
	});
}

/**
 * Add a message to the #potatoboard.
 *
 * @param {import("discord.js").Message} message - Message to add.
 */
export async function postMessageToBoard(message) {
	if (!message.guild) throw new TypeError("Cannot post DMs to potatoboard");

	const { author, files, embeds } = await extractMessageExtremities(message);

	const board = await message.guild?.channels.fetch(BOARD_CHANNEL);

	if (!board?.isText()) {
		throw new ReferenceError("Could not find board channel.");
	}

	const description = await messageToText(message);

	const boardEmbed = new MessageEmbed()
		.setColor(("displayColor" in author && author.displayColor) || "DEFAULT")
		.setDescription(description)
		.setAuthor({
			iconURL: author?.displayAvatarURL() || message.author.displayAvatarURL(),

			name: "displayName" in author ? author.displayName : author.username,
		})
		.setTimestamp(message.createdTimestamp);

	const button = new MessageButton()
		.setEmoji("👀")
		.setLabel("View Context")
		.setStyle("LINK")
		.setURL(
			`https://discord.com/channels/${message.guild?.id}/${message.channel.id}/${message.id}`,
		);
	const reaction = message.reactions.resolve(BOARD_EMOJI);

	if (!reaction) return;

	return await board.send({
		allowedMentions: process.env.NODE_ENV === "production" ? undefined : { users: [] },
		components: [new MessageActionRow().addComponents(button)],

		content: `**${BOARD_EMOJI} ${(reaction?.count || 0) - (reaction.me ? 1 : 0)}** | ${
			message.channel.type === "DM"
				? ""
				: `${message.channel.toString()}${
						message.channel.isThread()
							? ` (${message.channel.parent?.toString() || ""})`
							: ""
				  }`
		}${author ? ` | ${author.toString()}` : ""}`,
		embeds: [boardEmbed, ...embeds],
		files,
	});
}

/**
 * Update the count on a message on #potatoboard.
 *
 * @param {number} count - The updated count.
 * @param {import("discord.js").Message} boardMessage - The message to update.
 */
export async function updateReactionCount(count, boardMessage) {
	await (count < Math.max(MIN_REACTIONS - 1, 1)
		? boardMessage.delete()
		: boardMessage.edit({
				allowedMentions: process.env.NODE_ENV === "production" ? undefined : { users: [] },
				content: boardMessage.content.replace(/\d+/, `${count}`),
				embeds: boardMessage.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
				files: boardMessage.attachments.map((attachment) => attachment),
		  }));
}
