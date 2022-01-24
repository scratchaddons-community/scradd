import { Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import getAllMessages from "../lib/getAllMessages.js";
import dotenv from "dotenv";

dotenv.config();
export const BOARD_CHANNEL = process.env.BOARD_CHANNEL || "";
export const BOARD_EMOJI = "🥔";
export const MIN_REACTIONS = process.env.NODE_ENV === "production" ? 6 : 1;

export const MAX_REPLY_LENGTH = 100;

/** @param {Message} message */
export async function getMessageFromBoard(message) {
	if (!message.guild) return;
	const board = await message.guild.channels.fetch(BOARD_CHANNEL);
	if (!board?.isText())
		throw new Error("No board channel found. Make sure BOARD_CHANNEL is set in the .env file.");
	const fetchedMessages = await getAllMessages(board, (boardMessage) => {
		const component = boardMessage?.components[0]?.components?.[0];
		if (component?.type !== "BUTTON") return false;
		const [, , messageId] = component.url?.match(/\d+/g) || [];
		return messageId === message.id;
	});
	return fetchedMessages[0];
}

/**
 * @param {Message} message
 *
 * @returns {Promise<string>}
 */
async function generateReplyInfo(message) {
	if (message.type == "CONTEXT_MENU_COMMAND")
		return message.interaction?.user + " used **" + message.interaction?.commandName + "**:\n";

	if (message.type == "APPLICATION_COMMAND")
		return message.interaction?.user + " used **/" + message.interaction?.commandName + "**:\n";

	const repliedMessage = message.type === "REPLY" ? await message.fetchReference() : false;

	if (!repliedMessage) return "";
	const { author, content } = repliedMessage;

	if (content)
		return `*Replying to ${author}:*\n> ${
			content.length < MAX_REPLY_LENGTH
				? content
				: content.substring(0, MAX_REPLY_LENGTH - 3) + "…"
		}\n\n`;
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
			description = `<:edit:934526895255592981> ${
				message.author
			} changed the channel name: **${message.channel.isThread() && message.channel.name}**`;
			break;
		}
		case "CHANNEL_PINNED_MESSAGE": {
			// pin message
			const pinned = await message.fetchReference();
			description = `<:pin:934527802621956217> ${message.author} pinned [a message](https://discord.com/channels/${pinned.guild?.id}/${pinned.channel?.id}/${pinned.id}). See all **pinned messages**.`;
			break;
		}
		case "GUILD_MEMBER_JOIN": {
			// join server
			description = `<:add:934518444160856107> ${message.author} just joined the server!`;
			break;
		}
		case "CHANNEL_FOLLOW_ADD": {
			// follow channel
			description = `<:add:934518444160856107> ${message.author} has added **${message.content}** to this channel. Its most important updates will show up here.`;
			break;
		}
		case "RECIPIENT_ADD": {
			description = `<:add:934518444160856107> ${
				message.author
			} added ${message.mentions.users.first()} to the thread.`;
			break;
		}
		case "THREAD_CREATED": {
			// xxx started a thread: xxx. see all threads.
			description = `<:thread:934519757707812934> ${message.author} started a thread: **${message.content}** See all **threads**.`;
			break;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION": {
			// :nitro: **xxx** just boosted the server!
			description = `<:boost:934520614432145459> ${message.author} just boosted the server!`;
			break;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_1": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 1**!
			description = `<:boost:934520614432145459> ${message.author} just boosted the server! ${message.guild.name} has achieved **Level 1**!`;
			break;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_2": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 2**!
			description = `<:boost:934520614432145459> ${message.author} just boosted the server! ${message.guild.name} has achieved **Level 2**!`;
			break;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_3": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 3**!
			description = `<:boost:934520614432145459> ${message.author} just boosted the server! ${message.guild.name} has achieved **Level 3**!`;
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
		.setColor(0xffd700)
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

	await board.send({
		content:
			`**${BOARD_EMOJI} ${message.reactions.resolve(BOARD_EMOJI)?.count || 0}** | ${
				message.channel
			}` + (author ? ` | ${author}` : ""),
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
export async function updateReactionCount(newCount = 0, boardMessage) {
	if (newCount < Math.max(MIN_REACTIONS - 1, 1)) return boardMessage.delete();
	return boardMessage.edit({
		content: boardMessage.content.replace(/\d+/, `${newCount}`),
		embeds: boardMessage.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
		files: boardMessage.attachments.map((a) => a),
	});
}
