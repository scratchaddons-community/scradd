import { Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { escapeMessage, escapeLinks } from "./markdown.js";
import { generateHash, truncateText } from "./text.js";
import { badAttachments, badStickers, censor } from "../common/moderation/automod.js";
import { Embed } from "@discordjs/builders";

/** @param {import("discord.js").Message | import("discord.js").PartialMessage} message */
export async function extractMessageExtremities(message, allowLanguage = true) {
	const embeds = [
		...(!allowLanguage && typeof (await badStickers(message)).strikes === "number"
			? []
			: message.stickers.map((sticker) =>
					new MessageEmbed()
						.setImage(
							`https://media.discordapp.net/stickers/${sticker.id}.webp?size=160`,
						)
						.setColor("BLURPLE"),
			  )),
		...message.embeds
			.filter((embed) => !embed.video)
			.map((oldEmbed) => {
				const newEmbed = new MessageEmbed(oldEmbed);

				if (allowLanguage) return newEmbed;

				if (newEmbed.description) {
					const censored = censor(newEmbed.description);

					if (censored) newEmbed.setDescription(censored.censored);
				}

				if (newEmbed.title) {
					const censored = censor(newEmbed.title);

					if (censored) newEmbed.setTitle(censored.censored);
				}

				if (newEmbed.url && censor(newEmbed.url)) newEmbed.setURL("");

				if (newEmbed.image?.url && censor(newEmbed.image.url)) newEmbed.setImage("");

				if (newEmbed.thumbnail?.url && censor(newEmbed.thumbnail.url))
					newEmbed.setThumbnail("");

				if (newEmbed.footer?.text) {
					const censored = censor(newEmbed.footer.text);

					if (censored) {
						newEmbed.setFooter({
							text: censored.censored,
							iconURL: newEmbed.footer.iconURL,
						});
					}
				}

				if (newEmbed.author) {
					const censoredName = censor(newEmbed.author.name);
					const censoredUrl = newEmbed.author.url && censor(newEmbed.author.url);

					if (censoredName || censoredUrl) {
						newEmbed.setAuthor({
							name: censoredName ? censoredName.censored : newEmbed.author.name,
							iconURL: newEmbed.author.iconURL,
							url: censoredUrl ? "" : newEmbed.author.url,
						});
					}
				}

				newEmbed.setFields(
					newEmbed.fields.map((field) => {
						const censoredName = censor(field.name);
						const censoredValue = censor(field.value);
						return {
							name: censoredName ? censoredName.censored : field.name,
							value: censoredValue ? censoredValue.censored : field.value,
							inline: field.inline,
						};
					}),
				);

				return newEmbed;
			}),
	];

	while (embeds.length > 10) embeds.pop();

	return {
		embeds,
		files:
			!allowLanguage && typeof (await badAttachments(message)).language === "number"
				? []
				: message.attachments.toJSON(),
	};
}

/**
 * Get all messages from a channel.
 *
 * @author Taken From [discord-fetch-all](https://github.com/iColtz/discord-fetch-all/blob/b2c4322/src/functions/fetchMessages.ts) and adjusted
 *   for JSDoc and Discord.JS v13.
 * @deprecated Too laggy.
 *
 * @param {import("discord.js").TextBasedChannel} channel - The channel to fetch messages from.
 *
 * @returns {Promise<import("discord.js").Message[]>} - The messages.
 */
export async function getAllMessages(channel) {
	/** @type {import("discord.js").Message[]} */
	const messages = [];

	/** @type {string | undefined} */
	// eslint-disable-next-line fp/no-let -- This needs to be changable
	let lastId;

	do {
		// eslint-disable-next-line no-await-in-loop -- We can’t use `Promise.all` here
		const fetchedMessages = await channel.messages.fetch({ before: lastId, limit: 100 });

		messages.push(...Array.from(fetchedMessages.values()));
		lastId = fetchedMessages.lastKey();
	} while (lastId);

	return messages;
}

/** @param {import("discord.js").Message} message */
function handleLinks(message) {
	return message.webhookId ? message.content : escapeLinks(message.content);
}

/** @param {import("discord.js").Message} message */
function handleLoading(message) {
	return message.flags.has("LOADING")
		? (Date.now() - +message.createdAt) / 1_000 / 60 > 15
			? CONSTANTS.emojis.discord.error + " The application did not respond"
			: CONSTANTS.emojis.discord.typing +
			  " " +
			  escapeMessage(message.author.username) +
			  " is thinking..."
		: message.content;
}

/**
 * A property that returns the content that is rendered regardless of the message type. In some cases, this just returns the regular message
 * content. Otherwise this returns an English message denoting the contents of the system message.
 *
 * @param {import("discord.js").Message} message - Message to convert.
 *
 * @returns {Promise<string>} Text representation of the message.
 *
 * @see [discord.py](https://github.com/Rapptz/discord.py/blob/55849d9/discord/message.py#L1827-L1943).
 */
export async function messageToText(message, replies = true) {
	switch (message.type) {
		case "DEFAULT": {
			return handleLinks(message);
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
				` ${message.author.toString()} changed the ${
					// message.channel.type === "GUILD_FORUM" ? "post title" :
					"channel name"
				}: **${escapeMessage(message.content)}**`
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
				`${message.author.toString()} joined the party.`,
				`${message.author.toString()} is here.`,
				`Welcome, ${message.author.toString()}. We hope you brought pizza.`,
				`A wild ${message.author.toString()} appeared.`,
				`${message.author.toString()} just landed.`,
				`${message.author.toString()} just slid into the server.`,
				`${message.author.toString()} just showed up!`,
				`Welcome ${message.author.toString()}. Say hi!`,
				`${message.author.toString()} hopped into the server.`,
				`Everyone welcome ${message.author.toString()}!`,
				"Glad you're here, ${message.author.toString()}.",
				`Good to see you, ${message.author.toString()}.`,
				`Yay you made it, ${message.author.toString()}!`,
			];
			const createdAtMs = message.createdAt;

			return (
				CONSTANTS.emojis.discord.add +
				` ${
					formats[+createdAtMs % formats.length] ??
					`${message.author.toString()} just joined the server!`
				}`
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
		//     # the author will be a Member
		//     return f'{self.author.name} is live! Now streaming {self.author.activity.name}'  # type: ignore
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
			if (!replies) return handleLinks(message);
			const repliedMessage = await message.fetchReference().catch(() => {});

			if (!repliedMessage)
				return (
					`*${CONSTANTS.emojis.discord.reply} Original message was deleted.*\n` +
					`\n` +
					`${handleLinks(message)}`
				);

			const cleanContent = await messageToText(repliedMessage, false);

			return (
				`*[Replying to](${repliedMessage.url}) ${repliedMessage.author.toString()}${
					cleanContent ? `:*\n> ${truncateText(cleanContent, 300)}` : "*"
				}\n` +
				`\n` +
				`${handleLinks(message)}`
			);
		}
		case "THREAD_STARTER_MESSAGE": {
			const reference = await message.fetchReference().catch(() => {});

			// the resolved message for the reference will be a Message
			return reference
				? (await messageToText(reference)) || handleLoading(message)
				: `${CONSTANTS.emojis.discord.thread} Sorry, we couldn't load the first message in this thread`;
		}
		case "GUILD_INVITE_REMINDER": {
			return (
				"Wondering who to invite?\n" +
				"Start by inviting anyone who can help you build the server!"
			);
		}
		case "CONTEXT_MENU_COMMAND": {
			if (!replies) return handleLoading(message);
			return `*${message.interaction?.user.toString() ?? ""} used **${escapeMessage(
				message.interaction?.commandName ?? "",
			)}**:*\n${handleLoading(message)}`;
		}
		case "APPLICATION_COMMAND": {
			if (!replies) return handleLoading(message);
			return `*${message.interaction?.user.toString() ?? ""} used **/${escapeMessage(
				message.interaction?.commandName ?? "",
			)}**:*\n${handleLoading(message)}`;
		}
		case "CALL": {
			return CONSTANTS.emojis.discord.call + `${message.author.toString()} started a call.`;
		}
		default: {
			// Fallback for unknown message types
			return message.content ?? "";
		}
	}
}

/**
 * @param {import("discord.js").Message} message
 * @param {import("discord.js").EmojiIdentifierResolvable[]} reactions
 */
export async function reactAll(message, reactions) {
	for (const reaction of reactions) {
		await message.react(reaction);
	}
}

/**
 * @template {{ [key: string]: any }} T
 *
 * @param {(T | undefined)[]} array
 * @param {(value: T, index: number, array: (T | undefined)[]) => string} toString
 * @param {string} failMessage
 * @param {string} title
 * @param {(
 * 	options: (import("discord.js").InteractionReplyOptions | import("discord.js").WebhookEditMessageOptions) & { fetchReply: true },
 * ) => Promise<import("discord-api-types").APIMessage | import("discord.js").Message<boolean>>} reply
 */

export async function paginate(array, toString, failMessage, title, reply) {
	const PAGE_OFFSET = 15;
	const previousButton = new MessageButton()
		.setLabel("<< Previous")
		.setStyle("PRIMARY")
		.setDisabled(true)
		.setCustomId(generateHash("previous"));
	const numberOfPages = Math.ceil(array.length / PAGE_OFFSET);
	const nextButton = new MessageButton()
		.setLabel("Next >>")
		.setStyle("PRIMARY")
		.setDisabled(numberOfPages === 1)
		.setCustomId(generateHash("next"));

	// eslint-disable-next-line fp/no-let -- This must be changable.
	let offset = 0;

	/**
	 * Generate an embed that has the next page.
	 *
	 * @returns {import("discord.js").InteractionReplyOptions & { fetchReply: true }} - Embed with the next page.
	 */
	function generateMessage() {
		const content = array
			.filter(
				(suggestion, index) =>
					suggestion && index >= offset && index < offset + PAGE_OFFSET,
			)
			.map((current, index, all) =>
				current ? `${index + offset + 1}) ${toString(current, index, all)}` : false,
			)
			.join("\n")
			.trim();

		if (!content) {
			return {
				content: `${CONSTANTS.emojis.statuses.no} ${failMessage}`,
				ephemeral: true,
				fetchReply: true,
			};
		}

		return {
			components: [new MessageActionRow().addComponents(previousButton, nextButton)],

			embeds: [
				new Embed()
					.setTitle(title)
					.setDescription(content)
					.setFooter({
						text: `Page ${Math.floor(offset / PAGE_OFFSET) + 1}/${numberOfPages}`,
					})
					.setColor(CONSTANTS.themeColor),
			],
			fetchReply: true,
		};
	}

	let message = await reply(generateMessage());
	if (!(message instanceof Message)) throw new TypeError("message is not a Message");

	const collector =
		message.embeds[0] &&
		message.channel?.createMessageComponentCollector({
			filter: (buttonInteraction) =>
				[previousButton.customId, nextButton.customId].includes(
					buttonInteraction.customId,
				) && buttonInteraction.user.id === message.interaction?.user.id,

			time: CONSTANTS.collectorTime,
		});

	collector
		?.on("collect", async (buttonInteraction) => {
			if (buttonInteraction.customId === nextButton.customId) offset += PAGE_OFFSET;
			else offset -= PAGE_OFFSET;

			previousButton.setDisabled(offset === 0);
			nextButton.setDisabled(offset + PAGE_OFFSET >= array.length - 1);
			message = await reply(generateMessage());
			await buttonInteraction.deferUpdate();
			collector.resetTimer();
		})
		.on("end", async () => {
			previousButton.setDisabled(true);
			nextButton.setDisabled(true);
			await reply({
				components: [new MessageActionRow().addComponents(previousButton, nextButton)],

				embeds: message.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
				fetchReply: true,
			});
		});
}
