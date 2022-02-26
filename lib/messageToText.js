import escape from "./escape.js";
import truncateText from "./truncateText.js";

/**
 * Generate information about the message another message replied to.
 *
 * @param {import("discord.js").Message} message - Message that replied to another.
 *
 * @returns {Promise<string>} - Reply information.
 */
export async function generateReplyInfo(message) {
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
 * Generates a text representation of any message.
 *
 * @param {import("discord.js").Message} message Message to convert.
 *
 * @returns {Promise<string>} Text representation of the message.
 */
export default async function messageToText(message) {
	switch (message.type) {
		case "CHANNEL_NAME_CHANGE": {
			// Rename thread
			return `<:edit:938441054716297277> ${message.author.toString()} changed the channel name: **${
				message.channel.isThread() ? escape(message.channel.name) : ""
			}**`;
		}
		case "CHANNEL_PINNED_MESSAGE": {
			// Pin message
			const pinned = await message.fetchReference();

			return `<:pin:938441100258070568> ${message.author.toString()} pinned [a message](https://discord.com/channels/${encodeURIComponent(
				pinned.guild?.id || "",
			)}/${encodeURIComponent(pinned.channel?.id|| "")}/${encodeURIComponent(
				pinned.id,
			)}). See all **pinned messages**.`;
		}
		case "GUILD_MEMBER_JOIN": {
			// Join server
			return `<:add:938441019278635038> ${message.author.toString()} just joined the server!`;
		}
		case "CHANNEL_FOLLOW_ADD": {
			// Follow channel
			return `<:add:938441019278635038> ${message.author.toString()} has added **${escape(
				message.content,
			)}** to this channel. Its most important updates will show up here.`;
		}
		case "RECIPIENT_ADD": {
			return `<:add:938441019278635038> ${message.author.toString()} added ${
				message.mentions.users.first()?.toString() || ""
			} to the thread.`;
		}
		case "THREAD_CREATED": {
			// Xxx started a thread: xxx. see all threads.
			return `<:thread:938441090657296444> ${message.author.toString()} started a thread: **${escape(
				message.content,
			)}** See all **threads**.`;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION": {
			// :nitro: **xxx** just boosted the server!
			return `<:boost:938441038756986931> ${message.author.toString()} just boosted the server!`;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_1": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 1**!
			return `<:boost:938441038756986931> ${message.author.toString()} just boosted the server! ${escape(
				message.guild?.name || "",
			)} has achieved **Level 1**!`;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_2": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 2**!
			return `<:boost:938441038756986931> ${message.author.toString()} just boosted the server! ${escape(
				message.guild?.name || "",
			)} has achieved **Level 2**!`;
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_3": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 3**!
			return `<:boost:938441038756986931> ${message.author.toString()} just boosted the server! ${escape(
				message.guild?.name || "",
			)} has achieved **Level 3**!`;
		}
		case "APPLICATION_COMMAND":
		case "CONTEXT_MENU_COMMAND":
		case "REPLY": {
			return (await generateReplyInfo(message)) + message.content;
		}

		default: {
			// "DEFAULT" | "RECIPIENT_REMOVE" | "CALL" | "CHANNEL_ICON_CHANGE" | "GUILD_DISCOVERY_DISQUALIFIED" | "GUILD_DISCOVERY_REQUALIFIED" | "GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING" | "GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING" | "THREAD_STARTER_MESSAGE" | "GUILD_INVITE_REMINDER"
			return message.content;
		}
	}
}
