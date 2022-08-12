import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { extractMessageExtremities, getAllMessages, messageToText } from "../lib/message.js";

import { Embed } from "@discordjs/builders";
import { censor } from "./moderation/automod.js";

export const BOARD_CHANNEL = process.env.BOARD_CHANNEL ?? "";
export const BOARD_EMOJI = "🥔";
export const MIN_REACTIONS = process.env.NODE_ENV === "production" ? 8 : 2;

/**
 * Supplied a message in #potatoboard, get the original message that was reacted to.
 *
 * @param {import("discord.js").Message} boardMessage - Message in #potatoboard.
 *
 * @returns {Promise<import("discord.js").Message | undefined>} - Source message.
 */
export async function boardMessageToSource(boardMessage) {
	const component = boardMessage?.components[0]?.components?.[0];

	if (component?.type !== "BUTTON") return;

	const { guildId, channelId, messageId } =
		/^https?:\/\/(?:.+\.)?discord\.com\/channels\/(?<guildId>\d+|@me)\/(?<channelId>\d+)\/(?<messageId>\d+)\/?$/iu.exec(
			component.url ?? "",
		)?.groups ?? {};

	if (boardMessage.guild?.id !== guildId || !channelId || !messageId) return;

	const channel = await boardMessage.guild?.channels.fetch(channelId).catch(() => {});

	if (!channel?.isText()) return;

	const message = await channel.messages.fetch(messageId).catch(() => {});

	if (!message) return;

	return message;
}

/** @type {import("discord.js").Message[] | undefined} */
let MESSAGES;

/**
 * Supplied a message, get the message in #potatoboard that references it.
 *
 * @param {import("discord.js").Message} message - Message to find.
 *
 * @returns {Promise<import("discord.js").Message | undefined>} Message on #potatoboard.
 */
export async function sourceToBoardMessage(message) {
	if (!message.guild) return;

	const board = await message.guild.channels.fetch(BOARD_CHANNEL);

	if (!board?.isText()) {
		throw new ReferenceError("Could not find board channel");
	}

	MESSAGES ??= await getAllMessages(board);

	return MESSAGES.find((boardMessage) => {
		const component = boardMessage?.components[0]?.components?.[0];

		if (component?.type !== "BUTTON") return false;

		const messageId = /\d+$/.exec(component.url ?? "")?.[0];

		return messageId === message.id;
	});
}

/**
 * Add a message to the #potatoboard.
 *
 * @param {import("discord.js").Message} message - Message to add.
 */
export async function postMessageToBoard(message) {
	const { files, embeds } = await extractMessageExtremities(message, false);

	const board = await message.guild?.channels.fetch(BOARD_CHANNEL);

	if (!board?.isText()) throw new ReferenceError("Could not find board channel");

	const description = await messageToText(message);

	const censored = censor(description);
	const censoredName = censor(message.author.username);

	const boardEmbed = new Embed()
		.setColor(message.member?.displayColor ?? 0)
		.setDescription(censored ? censored.censored : description || null)
		.setAuthor({
			iconURL: (message.member ?? message.author).displayAvatarURL(),
			name:
				message.member?.displayName ??
				(censoredName ? censoredName.censored : message.author.username),
		})
		.setTimestamp(message.createdAt);

	const button = new MessageButton()
		.setEmoji("👀")
		.setLabel("View Context")
		.setStyle("LINK")
		.setURL(message.url);
	const reaction = message.reactions.resolve(BOARD_EMOJI);

	if (!reaction) return;

	MESSAGES ??= await getAllMessages(board);

	const boardMessage = await board.send({
		allowedMentions: process.env.NODE_ENV === "production" ? undefined : { users: [] },
		components: [new MessageActionRow().addComponents(button)],

		content: `**${BOARD_EMOJI} ${reaction?.count ?? 0}** | ${message.channel.toString()}${
			message.channel.isThread() ? ` (${message.channel.parent?.toString() ?? ""})` : ""
		} | ${message.author.toString()}`,
		embeds: [boardEmbed, ...embeds],
		files,
	});
	if (board.type === "GUILD_NEWS") {
		await boardMessage.crosspost();
	}
	MESSAGES.push(boardMessage);
	return boardMessage;
}

/**
 * Update the count on a message on #potatoboard.
 *
 * @param {number} count - The updated count.
 * @param {import("discord.js").Message} boardMessage - The message to update.
 */
export async function updateReactionCount(count, boardMessage) {
	MESSAGES ??= await getAllMessages(boardMessage.channel);

	if (count < Math.max(MIN_REACTIONS - 1, 1)) {
		MESSAGES = MESSAGES.filter(({ id }) => id !== boardMessage.id);
		await boardMessage.delete();
	} else {
		const newMessage = await boardMessage.edit({
			allowedMentions: process.env.NODE_ENV === "production" ? undefined : { users: [] },
			content: boardMessage.content.replace(/\d+/, `${count}`),
			embeds: boardMessage.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
			files: boardMessage.attachments.map((attachment) => attachment),
		});
		MESSAGES = MESSAGES.map((msg) => (msg.id === newMessage.id ? newMessage : msg));
	}
}
