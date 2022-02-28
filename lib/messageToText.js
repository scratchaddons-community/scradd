import escape from "./escape.js";
import truncateText from "./truncateText.js";

/**
 * Generates a text representation of any message.
 *
 * @param {import("discord.js").Message} message Message to convert.
 *
 * @returns {Promise<string>} Text representation of the message.
 *
 * @see https://github.com/Rapptz/discord.py/blob/45d498c1b76deaf3b394d17ccf56112fa691d160/discord/message.py#L997.
 */
export default async function messageToText(message) {
	switch (message.type) {
		case "DEFAULT": {
			return message.content;
		}

		case "RECIPIENT_ADD": {
			return `<:add:938441019278635038> ${message.author.toString()} added ${
				message.mentions.users.first()?.toString() || ""
			} to the ${message.guild ? "thread" : "group"}.`;
		}

		case "RECIPIENT_REMOVE": {
			return `<:remove:947707131879104554> ${message.author.toString()} removed ${
				message.mentions.users.first()?.toString() || ""
			} from the ${message.guild ? "thread" : "group"}.`;
		}

		case "CHANNEL_NAME_CHANGE": {
			// Rename thread
			return `<:edit:938441054716297277> ${message.author.toString()} changed the channel name: **${
				message.channel.isThread() ? escape(message.channel.name) : ""
			}**`;
		}

		case "CHANNEL_ICON_CHANGE": {
			return `<:edit:938441054716297277> ${message.author.toString()} changed the channel icon.`;
		}

		case "CHANNEL_PINNED_MESSAGE": {
			// Pin message
			const pinned = await message.fetchReference();

			return `<:pin:938441100258070568> ${message.author.toString()} pinned [a message](https://discord.com/channels/${encodeURIComponent(
				pinned.guild?.id || "",
			)}/${encodeURIComponent(pinned.channel?.id || "")}/${encodeURIComponent(
				pinned.id,
			)}) to this channel. See all **pinned messages**.`;
		}

		case "GUILD_MEMBER_JOIN": {
			// Join server
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
				"<:add:938441019278635038> " +
				(formats[timestamp % formats.length] || "{0} just joined the server!").replaceAll(
					"{0}",
					message.author.toString(),
				)
			);
		}

		case "USER_PREMIUM_GUILD_SUBSCRIPTION": {
			// :nitro: **xxx** just boosted the server!
			return `<:boost:938441038756986931> ${message.author.toString()} just boosted the server${
				message.content ? ` **${escape(message.content)}** times` : ""
			}!`;
		}

		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_1": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 1**!
			return `<:boost:938441038756986931> ${message.author.toString()} just boosted the server${
				message.content ? ` **${escape(message.content)}** times` : ""
			}! ${escape(message.guild?.name || "")} has achieved **Level 1**!`;
		}

		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_2": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 2**!
			return `<:boost:938441038756986931> ${message.author.toString()} just boosted the server${
				message.content ? ` **${escape(message.content)}** times` : ""
			}! ${escape(message.guild?.name || "")} has achieved **Level 2**!`;
		}

		case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_3": {
			// :nitro: **xxx** just boosted the server! xxx has achieved **Level 3**!
			return `<:boost:938441038756986931> ${message.author.toString()} just boosted the server${
				message.content ? ` **${escape(message.content)}** times` : ""
			}! ${escape(message.guild?.name || "")} has achieved **Level 3**!`;
		}

		case "CHANNEL_FOLLOW_ADD": {
			// Follow channel
			return `<:add:938441019278635038> ${message.author.toString()} has added **${escape(
				message.content,
			)}** to this channel. Its most important updates will show up here.`;
		}

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
			// Xxx started a thread: xxx. see all threads.
			return `<:thread:938441090657296444> ${message.author.toString()} started a thread: **${escape(
				message.content,
			)}** See all **threads**.`;
		}

		case "THREAD_STARTER_MESSAGE": {
			const reference = await message.fetchReference().catch(() => false);
			if (typeof reference === "boolean")
				return "Sorry, we couldn't load the first message in this thread";
			else return messageToText(reference) || message.content;
		}

		case "GUILD_INVITE_REMINDER": {
			return "Wondering who to invite?\nStart by inviting anyone who can help you build the server!";
		}

		case "CONTEXT_MENU_COMMAND": {
			return `${message.interaction?.user.toString() || ""} used **${escape(
				message.interaction?.commandName || "",
			)}**:\n${message.content}`;
		}

		case "APPLICATION_COMMAND": {
			return `${message.interaction?.user.toString() || ""} used **/${escape(
				message.interaction?.commandName || "",
			)}**:\n${message.content}`;
		}

		case "REPLY": {
			const repliedMessage = await message.fetchReference().catch(() => {});

			if (!repliedMessage) return message.content;

			const { author, cleanContent } = repliedMessage;

			if (cleanContent)
				return `*Replying to ${author.toString()}:*\n> ${truncateText(
					cleanContent,
					100,
				)}\n\n${message.content}`;

			return `*Replying to ${author.toString()}*\n\n${message.content}`;
		}

		case "CALL": {
			return `${message.author.toString()} started a call.`;
		}
		default: {
			// imposable
			return `(${message.type}) ${message.content}`;
		}
	}
}
