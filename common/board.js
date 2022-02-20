/** @file Code To perform operations related to the potatoboard. */
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import dotenv from "dotenv";
import escape, { escapeForWebhook } from "../lib/escape.js";

import getAllMessages from "../lib/getAllMessages.js";
import truncateText from "../lib/truncateText.js";

dotenv.config();

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

	const channel = await boardMessage.guild?.channels.fetch(channelId);

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

	if (!board?.isText())
		throw new Error("No board channel found. Make sure BOARD_CHANNEL is set in the .env file.");

	const fetchedMessages = await getAllMessages(board);

	return fetchedMessages.find((boardMessage) => {
		const component = boardMessage?.components[0]?.components?.[0];

		if (component?.type !== "BUTTON") return false;

		const messageId = /\d+$/.exec(component.url || "")?.[0];

		return messageId === message.id;
	});
}

/**
 * Generate information about the message another message replied to.
 *
 * @param {import("discord.js").Message} message - Message that replied to another.
 *
 * @returns {Promise<string>} - Reply information.
 */
async function generateReplyInfo(message) {
	if (message.type === "CONTEXT_MENU_COMMAND") {
		return `${message.interaction?.user.toString() || ""} used **${escape(
			message.interaction?.commandName || "",
		)}**:\n`;
	}

	if (message.type === "APPLICATION_COMMAND") {
		return `${message.interaction?.user.toString() || ""} used **/${escape(
			message.interaction?.commandName || "",
		)}**:\n`;
	}

	const repliedMessage = message.type === "REPLY" ? await message.fetchReference() : false;

	if (!repliedMessage) return "";

	const { author, cleanContent } = repliedMessage;

	if (cleanContent)
		return `*Replying to ${author.toString()}:*\n> ${truncateText(cleanContent, 100)}\n\n`;

	return `*Replying to ${author.toString()}*\n\n`;
}

/**
 * Add a message to the #potatoboard.
 *
 * @param {import("discord.js").Message} message - Message to add.
 */
export async function postMessageToBoard(message) {
	if (!message.guild) return;

	const author = await message.guild?.members.fetch(message.author).catch(() => {});

	const board = await message.guild.channels.fetch(BOARD_CHANNEL);

	if (!board?.isText())
		throw new Error("No board channel found. Make sure BOARD_CHANNEL is set in the .env file.");

	let description;

	switch (message.type) {
		case "CHANNEL_NAME_CHANGE": {
			// Rename thread
			description = `<:edit:938441054716297277> ${message.author.toString()} changed the channel name: **${
				message.channel.isThread() ? escape(message.channel.name) : ""
			}**`;

			break;
		}
		case "CHANNEL_PINNED_MESSAGE": {
			// Pin message
			const pinned = await message.fetchReference();

			description = `<:pin:938441100258070568> ${message.author.toString()} pinned [a message](https://discord.com/channels/${encodeURIComponent(
				pinned.guild?.id || "",
			)}/${encodeURIComponent(pinned.channel?.id)}/${encodeURIComponent(
				pinned.id,
			)}). See all **pinned messages**.`;

			break;
		}
		case "GUILD_MEMBER_JOIN": {
			// Join server
			description = `<:add:938441019278635038> ${message.author.toString()} just joined the server!`;

			break;
		}
		case "CHANNEL_FOLLOW_ADD": {
			// Follow channel
			description = `<:add:938441019278635038> ${message.author.toString()} has added **${escape(
				message.content,
			)}** to this channel. Its most important updates will show up here.`;

			break;
		}
		case "RECIPIENT_ADD": {
			description = `<:add:938441019278635038> ${message.author.toString()} added ${
				message.mentions.users.first()?.toString() || ""
			} to the thread.`;

			break;
		}
		case "THREAD_CREATED": {
			// Xxx started a thread: xxx. see all threads.
			description = `<:thread:938441090657296444> ${message.author.toString()} started a thread: **${escape(
				message.content,
			)}** See all **threads**.`;

			break;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION": {
			// :nitro: **xxx** just boosted the server!
			description = `<:boost:938441038756986931> ${message.author.toString()} just boosted the server!`;

			break;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_1": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 1**!
			description = `<:boost:938441038756986931> ${message.author.toString()} just boosted the server! ${escape(
				message.guild.name,
			)} has achieved **Level 1**!`;

			break;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_2": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 2**!
			description = `<:boost:938441038756986931> ${message.author.toString()} just boosted the server! ${escape(
				message.guild.name,
			)} has achieved **Level 2**!`;

			break;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_3": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 3**!
			description = `<:boost:938441038756986931> ${message.author.toString()} just boosted the server! ${escape(
				message.guild.name,
			)} has achieved **Level 3**!`;

			break;
		}
		case "APPLICATION_COMMAND":
		case "CONTEXT_MENU_COMMAND":
		case "REPLY": {
			description = (await generateReplyInfo(message)) + message.content;

			break;
		}

		default: {
			description = message.content;
		}
	}

	const embed = new MessageEmbed()
		.setColor(author?.displayColor ?? 0xffd700)
		.setDescription(description)
		.setAuthor({
			iconURL:
				author?.displayAvatarURL() ||
				message.author.displayAvatarURL() ||
				message.author.defaultAvatarURL ||
				"",

			name: author?.displayName || message.author.username,
		})
		.setTimestamp(message.createdTimestamp);

	const embeds = [
		embed,
		...message.stickers.map((sticker) =>
			new MessageEmbed().setImage(
				`https://media.discordapp.net/stickers/${sticker.id}.webp?size=160`,
			),
		),
		...message.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
	];

	while (embeds.length > 10) embeds.pop();

	const button = new MessageButton()
		.setEmoji("👀")
		.setLabel("View Context")
		.setStyle("LINK")
		.setURL(
			`https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
		);
	const reaction = message.reactions.resolve(BOARD_EMOJI);

	if (!reaction) return;

	await board.send({
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

		embeds,
		files: message.attachments.map((attachments) => attachments),
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
				content: boardMessage.content.replace(/\d+/, `${count}`),
				embeds: boardMessage.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
				files: boardMessage.attachments.map((attachment) => attachment),
		  }));
}
