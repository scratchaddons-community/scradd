import { Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import getAllMessages from "../lib/getAllMessages.js";
import dotenv from "dotenv";
import truncateText from "../lib/truncateText.js";

dotenv.config();
export const BOARD_CHANNEL = process.env.BOARD_CHANNEL || "";
export const BOARD_EMOJI = "🥔";
export const MIN_REACTIONS = process.env.NODE_ENV === "production" ? 6 : 1;

/** @param {Message} boardMessage */
export async function getSourceFromBoard(boardMessage) {
	const component = boardMessage?.components[0]?.components?.[0];
	if (component?.type !== "BUTTON") return false;
	const { guildId, channelId, messageId } =
		component.url?.match(
			/^https?:\/\/(?:.+\.)?discord\.com\/channels\/(?<guildId>\d+)\/(?<channelId>\d+)\/(?<messageId>\d+)\/?$/iu,
		)?.groups || {};
	if (boardMessage.guild?.id !== guildId || !channelId || !messageId) return false;
	const channel = await boardMessage.guild?.channels.fetch(channelId);
	if (!channel?.isText()) return false;
	const message = await channel.messages.fetch(messageId);
	if (!message) return false;
	return message;
}

/** @param {Message} message */
export async function getMessageFromBoard(message) {
	if (!message.guild) return;
	const board = await message.guild.channels.fetch(BOARD_CHANNEL);
	if (!board?.isText())
		throw new Error("No board channel found. Make sure BOARD_CHANNEL is set in the .env file.");
	const fetchedMessages = await getAllMessages(board);
	return fetchedMessages.find((boardMessage) => {
		const component = boardMessage?.components[0]?.components?.[0];
		if (component?.type !== "BUTTON") return false;
		const messageId = component.url?.match(/\d+$/)?.[0];
		return messageId === message.id;
	});
}

/**
 * @param {Message} message
 *
 * @returns {Promise<string>}
 */
async function generateReplyInfo(message) {
	if (message.type == "CONTEXT_MENU_COMMAND")
		return (
			message.interaction?.user.toString() +
			" used **" +
			message.interaction?.commandName +
			"**:\n"
		);

	if (message.type == "APPLICATION_COMMAND")
		return (
			message.interaction?.user.toString() +
			" used **/" +
			message.interaction?.commandName +
			"**:\n"
		);

	const repliedMessage = message.type === "REPLY" ? await message.fetchReference() : false;

	if (!repliedMessage) return "";
	const { author, cleanContent } = repliedMessage;

	if (cleanContent) return `*Replying to ${author}:*\n> ${truncateText(cleanContent, 100)}\n\n`;
	else return `*Replying to ${author}*\n\n`;
}

/** @param {Message} message */
export async function postMessageToBoard(message) {
	if (!message.guild) return;

	const author = await message.guild?.members.fetch(message.author).catch(() => {});

	const board = await message.guild.channels.fetch(BOARD_CHANNEL);
	if (!board?.isText())
		throw new Error("No board channel found. Make sure BOARD_CHANNEL is set in the .env file.");

	let description = "";
	switch (message.type) {
		case "CHANNEL_NAME_CHANGE": {
			// rename thread
			description = `<:edit:938441054716297277> ${
				message.author
			} changed the channel name: **${message.channel.isThread() && message.channel.name}**`;
			break;
		}
		case "CHANNEL_PINNED_MESSAGE": {
			// pin message
			const pinned = await message.fetchReference();
			description = `<:pin:938441100258070568> ${message.author} pinned [a message](https://discord.com/channels/${pinned.guild?.id}/${pinned.channel?.id}/${pinned.id}). See all **pinned messages**.`;
			break;
		}
		case "GUILD_MEMBER_JOIN": {
			// join server
			description = `<:add:938441019278635038> ${message.author} just joined the server!`;
			break;
		}
		case "CHANNEL_FOLLOW_ADD": {
			// follow channel
			description = `<:add:938441019278635038> ${message.author} has added **${message.content}** to this channel. Its most important updates will show up here.`;
			break;
		}
		case "RECIPIENT_ADD": {
			description = `<:add:938441019278635038> ${
				message.author
			} added ${message.mentions.users.first()} to the thread.`;
			break;
		}
		case "THREAD_CREATED": {
			// xxx started a thread: xxx. see all threads.
			description = `<:thread:938441090657296444> ${message.author} started a thread: **${message.content}** See all **threads**.`;
			break;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION": {
			// :nitro: **xxx** just boosted the server!
			description = `<:boost:938441038756986931> ${message.author} just boosted the server!`;
			break;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_1": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 1**!
			description = `<:boost:938441038756986931> ${message.author} just boosted the server! ${message.guild.name} has achieved **Level 1**!`;
			break;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_2": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 2**!
			description = `<:boost:938441038756986931> ${message.author} just boosted the server! ${message.guild.name} has achieved **Level 2**!`;
			break;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_3": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 3**!
			description = `<:boost:938441038756986931> ${message.author} just boosted the server! ${message.guild.name} has achieved **Level 3**!`;
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
			name: author?.displayName || message.author.username,
			iconURL:
				author?.displayAvatarURL() ||
				message.author.displayAvatarURL() ||
				message.author.defaultAvatarURL ||
				"",
		})
		.setTimestamp(message.createdTimestamp);

	const embeds = [
		embed,
		...message.stickers.map((sticker) => {
			return new MessageEmbed()
				.setDescription("")
				.setImage(`https://media.discordapp.net/stickers/` + sticker.id + `.webp?size=160`);
		}),
		...message.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
	];

	while (embeds.length > 10) embeds.pop();

	const button = new MessageButton()
		.setEmoji("👀")
		.setLabel("View Context")
		.setStyle("LINK")
		.setURL(
			"https://discord.com/channels/" +
				message.guild.id +
				"/" +
				message.channel.id +
				"/" +
				message.id,
		);
	const reaction = message.reactions.resolve(BOARD_EMOJI);
	if (!reaction) return;
	await board.send({
		content:
			`**${BOARD_EMOJI} ${reaction?.count - (reaction.me ? 1 : 0)}** | ${message.channel}` +
			(message.channel.isThread() ? ` (${message.channel.parent})` : "") +
			(author ? ` | ${author}` : ""),
		embeds,
		files: message.attachments.map((a) => a),
		components: [new MessageActionRow().addComponents(button)],
		allowedMentions: process.env.NODE_ENV === "production" ? undefined : { users: [] },
	});
}

/**
 * @param {number} newCount
 * @param {Message} boardMessage
 */
export async function updateReactionCount(newCount, boardMessage) {
	if (newCount < Math.max(MIN_REACTIONS - 1, 1)) return boardMessage.delete();
	return boardMessage.edit({
		allowedMentions: process.env.NODE_ENV === "production" ? undefined : { users: [] },
		content: boardMessage.content.replace(/\d+/, `${newCount}`),
		embeds: boardMessage.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
		files: boardMessage.attachments.map((a) => a),
	});
}
