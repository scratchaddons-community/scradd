import CONSTANTS from "../common/CONSTANTS.js";
import escapeMessage, { escapeLinks } from "./escape.js";
import truncateText from "./truncateText.js";

/** @param {import("discord.js").Message} message */
function handleLinks(message) {
	return message.flags.has("LOADING")
		? (Date.now() - +message.createdAt) / 1_000 / 60 > 15
			? CONSTANTS.emojis.discord.error + " The application did not respond"
			: CONSTANTS.emojis.discord.typing + " " + message.author.username + " is thinking…"
		: message.webhookId
		? message.content
		: escapeLinks(message.content);
}

/**
 * Generates a text representation of any message.
 *
 * @param {import("discord.js").Message} message - Message to convert.
 *
 * @returns {Promise<string | undefined>} Text representation of the message.
 *
 * @see [discord.py](https://github.com/Rapptz/discord.py/blob/1e4908b4032dc7346ce9c1b17f0250a299f97737/discord/message.py#L1738-L1851).
 */
export default async function messageToText(message, replies = true) {
	switch (message.type) {
		case "DEFAULT": {
			return handleLinks(message) || undefined;
		}
		case "RECIPIENT_ADD": {
			return (
				CONSTANTS.emojis.discord.add +
				` ${message.author.toString()} added ${
					message.mentions.users.first()?.toString() ?? ""
				} to the ${message.guild ? "thread" : "group"}.`
			);
		}
		case "RECIPIENT_REMOVE": {
			return (
				CONSTANTS.emojis.discord.remove +
				` ${message.author.toString()} removed ${
					message.mentions.users.first()?.toString() ?? ""
				} from the ${message.guild ? "thread" : "group"}.`
			);
		}
		case "CHANNEL_NAME_CHANGE": {
			return (
				CONSTANTS.emojis.discord.edit +
				` ${message.author.toString()} changed the channel name: **${escapeMessage(
					message.content,
				)}**`
			);
		}
		case "CHANNEL_ICON_CHANGE": {
			return (
				CONSTANTS.emojis.discord.edit +
				` ${message.author.toString()} changed the channel icon.`
			);
		}
		case "CHANNEL_PINNED_MESSAGE": {
			const pinned = await message.fetchReference().catch(() => {});

			return (
				CONSTANTS.emojis.discord.pin +
				` ${message.author.toString()} pinned [a message](<${
					pinned?.url || ""
				}>) to this channel. See all [pinned messages](<https://discord.com/channels/${
					pinned?.guild?.id ?? "@me"
				}/${pinned?.channel?.id ?? ""}).`
			);
		}
		case "GUILD_MEMBER_JOIN": {
			const formats = [
				"{0} joined the party.",
				"{0} is here.",
				"Welcome, {0}. We hope you brought pizza.",
				"A wild {0} appeared.",
				"{0} just landed.",
				"{0} just slid into the server.",
				"{0} just showed up!",
				"Welcome {0}. Say hi!",
				"{0} hopped into the server.",
				"Everyone welcome {0}!",
				"Glad you're here, {0}.",
				"Good to see you, {0}.",
				"Yay you made it, {0}!",
			];
			const timestamp = message.createdTimestamp;

			return (
				CONSTANTS.emojis.discord.add +
				` ${(
					formats[timestamp % formats.length] ?? "{0} just joined the server!"
				).replaceAll("{0}", message.author.toString())}`
			);
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION": {
			return (
				CONSTANTS.emojis.discord.boost +
				` ${message.author.toString()} just boosted the server${
					message.content ? ` **${escapeMessage(message.content)}** times` : ""
				}!`
			);
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_1": {
			return (
				CONSTANTS.emojis.discord.boost +
				` ${message.author.toString()} just boosted the server${
					message.content ? ` **${escapeMessage(message.content)}** times` : ""
				}! ${escapeMessage(message.guild?.name ?? "")} has achieved **Level 1**!`
			);
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_2": {
			return (
				CONSTANTS.emojis.discord.boost +
				` ${message.author.toString()} just boosted the server${
					message.content ? ` **${escapeMessage(message.content)}** times` : ""
				}! ${escapeMessage(message.guild?.name ?? "")} has achieved **Level 2**!`
			);
		}
		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_3": {
			return (
				CONSTANTS.emojis.discord.boost +
				` ${message.author.toString()} just boosted the server${
					message.content ? ` **${escapeMessage(message.content)}** times` : ""
				}! ${escapeMessage(message.guild?.name ?? "")} has achieved **Level 3**!`
			);
		}
		case "CHANNEL_FOLLOW_ADD": {
			return (
				CONSTANTS.emojis.discord.add +
				` ${message.author.toString()} has added **${escapeMessage(
					message.content,
				)}** to this channel. Its most important updates will show up here.`
			);
		}
		// if self.type is MessageType.guild_stream:
		// # the author will be a Member
		// return f'{self.author.name} is live! Now streaming {self.author.activity.name}'  # type: ignore
		case "GUILD_DISCOVERY_DISQUALIFIED": {
			return "This server has been removed from Server Discovery because it no longer passes all the requirements. Check Server Settings for more details.";
		}
		case "GUILD_DISCOVERY_REQUALIFIED": {
			return "This server is eligible for Server Discovery again and has been automatically relisted!";
		}
		case "GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING": {
			return "This server has failed Discovery activity requirements for 1 week. If this server fails for 4 weeks in a row, it will be automatically removed from Discovery.";
		}
		case "GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING": {
			return "This server has failed Discovery activity requirements for 3 weeks in a row. If this server fails for 1 more week, it will be removed from Discovery.";
		}
		case "THREAD_CREATED": {
			return (
				CONSTANTS.emojis.discord.thread +
				` ${message.author.toString()} started a thread: **${escapeMessage(
					message.content,
				)}** See all **threads**.`
			);
		}
		case "REPLY": {
			if (!replies) return handleLinks(message) || undefined;
			const repliedMessage = await message.fetchReference().catch(() => {});

			if (!repliedMessage)
				return (
					`*${CONSTANTS.emojis.discord.reply} Original message was deleted.*\n` +
					`\n` +
					`${handleLinks(message)}`
				);

			const cleanContent = await messageToText(repliedMessage, false);

			return (
				`*Replying to ${repliedMessage.author.toString()}${
					cleanContent ? `:*\n> ${truncateText(cleanContent, 100)}` : "*"
				}\n` +
				`\n` +
				`${handleLinks(message)}`
			);
		}
		case "THREAD_STARTER_MESSAGE": {
			const reference = await message.fetchReference().catch(() => {});

			return reference
				? ((await messageToText(reference)) ?? handleLinks(message)) || undefined
				: `${CONSTANTS.emojis.discord.thread} Sorry, we couldn't load the first message in this thread`;
		}
		case "GUILD_INVITE_REMINDER": {
			return (
				"Wondering who to invite?\n" +
				"Start by inviting anyone who can help you build the server!"
			);
		}
		case "CONTEXT_MENU_COMMAND": {
			if (!replies) return handleLinks(message) || undefined;
			return `*${message.interaction?.user.toString() ?? ""} used **${escapeMessage(
				message.interaction?.commandName ?? "",
			)}**:*\n${handleLinks(message)}`;
		}
		case "APPLICATION_COMMAND": {
			if (!replies) return handleLinks(message) || undefined;
			return `*${message.interaction?.user.toString() ?? ""} used **/${escapeMessage(
				message.interaction?.commandName ?? "",
			)}**:*\n${handleLinks(message)}`;
		}
		case "CALL": {
			return CONSTANTS.emojis.discord.call + `${message.author.toString()} started a call.`;
		}
	}
}
