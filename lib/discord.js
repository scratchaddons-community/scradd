import {
	ActionRow,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	ComponentType,
	EmbedBuilder,
	MessageType,
	SelectMenuBuilder,
} from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { escapeMessage, escapeLinks } from "./markdown.js";
import { generateHash, truncateText } from "./text.js";
import { badAttachments, badStickers, censor } from "../common/moderation/automod.js";
import { MessageActionRowBuilder } from "../common/types/ActionRowBuilder.js";

/**
 * @param {import("discord.js").Message | import("discord.js").PartialMessage} message
 *
 * @returns {Promise<Required<Pick<import("discord.js").BaseMessageOptions, "embeds" | "files">>>}
 */
export async function extractMessageExtremities(message, allowLanguage = true) {
	const embeds = [
		...(!allowLanguage && typeof (await badStickers(message)).strikes === "number"
			? []
			: message.stickers.map((sticker) =>
					new EmbedBuilder().setImage(sticker.url).setColor(Colors.Blurple),
			  )),
		...message.embeds
			.filter((embed) => !embed.video)
			.map((oldEmbed) => {
				const newEmbed = EmbedBuilder.from(oldEmbed);
				const { data } = newEmbed;

				if (allowLanguage) return newEmbed;

				if (data.description) {
					const censored = censor(data.description);

					if (censored) newEmbed.setDescription(censored.censored);
				}

				if (data.title) {
					const censored = censor(data.title);

					if (censored) newEmbed.setTitle(censored.censored);
				}

				if (data.url && censor(data.url)) newEmbed.setURL("");

				if (data.image?.url && censor(data.image.url)) newEmbed.setImage("");

				if (data.thumbnail?.url && censor(data.thumbnail.url)) newEmbed.setThumbnail("");

				if (data.footer?.text) {
					const censored = censor(data.footer.text);

					if (censored) {
						newEmbed.setFooter({
							text: censored.censored,
							iconURL: data.footer.icon_url,
						});
					}
				}

				if (data.author) {
					const censoredName = censor(data.author.name);
					const censoredUrl = data.author.url && censor(data.author.url);

					if (censoredName || censoredUrl) {
						newEmbed.setAuthor({
							name: censoredName ? censoredName.censored : data.author.name,
							iconURL: data.author.icon_url,
							url: censoredUrl ? "" : data.author.url,
						});
					}
				}

				newEmbed.setFields(
					(data.fields || []).map((field) => {
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
 * @deprecated Too laggy.
 *
 * @template {import("discord.js").Message<C extends import("discord.js").GuildTextBasedChannel ? true : false>} T
 * @template {import("discord.js").TextBasedChannel} C
 *
 * @param {C} channel - The channel to fetch messages from.
 *
 * @returns {Promise<T[]>} - The messages.
 */
export async function getAllMessages(channel) {
	/** @type {T[]} */
	const messages = [];

	/** @type {import("discord.js").Snowflake | undefined} */
	// eslint-disable-next-line fp/no-let -- This needs to be changable
	let lastId;

	do {
		// eslint-disable-next-line no-await-in-loop -- We can’t use `Promise.all` here
		const fetchedMessages = await channel.messages.fetch({ before: lastId, limit: 100 });

		// @ts-expect-error -- This is the right type.
		messages.push(fetchedMessages.toJSON());
		lastId = fetchedMessages.lastKey();
	} while (lastId);

	return messages;
}

/**
 * A property that returns the content that is rendered regardless of the message type. In some cases, this just returns the regular message
 * content. Otherwise this returns an English message denoting the contents of the system message.
 *
 * @author [Rapptz/discord.py](https://github.com/Rapptz/discord.py/blob/40986f9/discord/message.py#L1825-L1944).
 *
 * @param {import("discord.js").Message} message - Message to convert.
 *
 * @returns {Promise<string>} Text representation of the message.
 */
export async function messageToText(message, replies = true) {
	const linklessContent = message.webhookId ? message.content : escapeLinks(message.content);

	const actualContent = message.flags.has("Loading")
		? (Date.now() - +message.createdAt) / 1_000 / 60 > 15
			? CONSTANTS.emojis.discord.error + " The application did not respond"
			: CONSTANTS.emojis.discord.typing +
			  " " +
			  escapeMessage(message.author.username) +
			  " is thinking..."
		: message.content;

	switch (message.type) {
		case MessageType.Default: {
			return linklessContent;
		}
		case MessageType.RecipientAdd: {
			return (
				CONSTANTS.emojis.discord.add +
				` ${message.author.toString()} added ${
					message.mentions.users.first()?.toString() ?? ""
				} to the ${message.guild ? "thread" : "group"}.`
			);
		}
		case MessageType.RecipientRemove: {
			return (
				CONSTANTS.emojis.discord.remove +
				` ${message.author.toString()} removed ${
					message.mentions.users.first()?.toString() ?? ""
				} from the ${message.guild ? "thread" : "group"}.`
			);
		}
		case MessageType.ChannelNameChange: {
			return (
				CONSTANTS.emojis.discord.edit +
				` ${message.author.toString()} changed the ${
					// message.channel.type === ChannelType.GuildForum ? "post title" :
					"channel name"
				}: **${escapeMessage(message.content)}**`
			);
		}
		case MessageType.ChannelIconChange: {
			return (
				CONSTANTS.emojis.discord.edit +
				` ${message.author.toString()} changed the channel icon.`
			);
		}
		case MessageType.ChannelPinnedMessage: {
			const pinned = await message.fetchReference().catch(() => {});

			return (
				CONSTANTS.emojis.discord.pin +
				` ${message.author.toString()} pinned [a message](${
					pinned?.url || ""
				}) to this channel. See all [pinned messages](${pinned?.channel.url}).`
			);
		}
		case MessageType.UserJoin: {
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

			return (
				CONSTANTS.emojis.discord.add + ` ${formats[+message.createdAt % formats.length]}`
			);
		}
		case MessageType.GuildBoost: {
			return (
				CONSTANTS.emojis.discord.boost +
				` ${message.author.toString()} just boosted the server${
					message.content ? ` **${escapeMessage(message.content)}** times` : ""
				}!`
			);
		}
		case MessageType.GuildBoostTier1: {
			return (
				CONSTANTS.emojis.discord.boost +
				` ${message.author.toString()} just boosted the server${
					message.content ? ` **${escapeMessage(message.content)}** times` : ""
				}! ${escapeMessage(message.guild?.name ?? "")} has achieved **Level 1**!`
			);
		}
		case MessageType.GuildBoostTier2: {
			return (
				CONSTANTS.emojis.discord.boost +
				` ${message.author.toString()} just boosted the server${
					message.content ? ` **${escapeMessage(message.content)}** times` : ""
				}! ${escapeMessage(message.guild?.name ?? "")} has achieved **Level 2**!`
			);
		}
		case MessageType.GuildBoostTier3: {
			return (
				CONSTANTS.emojis.discord.boost +
				` ${message.author.toString()} just boosted the server${
					message.content ? ` **${escapeMessage(message.content)}** times` : ""
				}! ${escapeMessage(message.guild?.name ?? "")} has achieved **Level 3**!`
			);
		}
		case MessageType.ChannelFollowAdd: {
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
		case MessageType.GuildDiscoveryDisqualified: {
			return "This server has been removed from Server Discovery because it no longer passes all the requirements. Check Server Settings for more details.";
		}
		case MessageType.GuildDiscoveryRequalified: {
			return "This server is eligible for Server Discovery again and has been automatically relisted!";
		}
		case MessageType.GuildDiscoveryGracePeriodInitialWarning: {
			return "This server has failed Discovery activity requirements for 1 week. If this server fails for 4 weeks in a row, it will be automatically removed from Discovery.";
		}
		case MessageType.GuildDiscoveryGracePeriodFinalWarning: {
			return "This server has failed Discovery activity requirements for 3 weeks in a row. If this server fails for 1 more week, it will be removed from Discovery.";
		}
		case MessageType.ThreadCreated: {
			return (
				CONSTANTS.emojis.discord.thread +
				` ${message.author.toString()} started a thread: **${escapeMessage(
					message.content,
				)}** See all **threads**.`
			);
		}
		case MessageType.Reply: {
			if (!replies) return linklessContent;
			const repliedMessage = await message.fetchReference().catch(() => {});

			if (!repliedMessage)
				return (
					`*${CONSTANTS.emojis.discord.reply} Original message was deleted.*\n\n` +
					linklessContent
				);

			const cleanContent = await messageToText(repliedMessage, false);

			return (
				`*[Replying to](${repliedMessage.url}) ${repliedMessage.author.toString()}${
					cleanContent ? `:*\n> ${truncateText(cleanContent, 300)}` : "*"
				}\n\n` + linklessContent
			);
		}
		case MessageType.ThreadStarterMessage: {
			const reference = await message.fetchReference().catch(() => {});

			// the resolved message for the reference will be a Message
			return reference
				? (await messageToText(reference, replies)) || actualContent
				: `${CONSTANTS.emojis.discord.thread} Sorry, we couldn't load the first message in this thread`;
		}
		case MessageType.GuildInviteReminder: {
			return (
				"Wondering who to invite?\n" +
				"Start by inviting anyone who can help you build the server!"
			);
		}
		case MessageType.ContextMenuCommand: {
			if (!replies) return actualContent;
			return `*${message.interaction?.user.toString() ?? ""} used **${escapeMessage(
				message.interaction?.commandName ?? "",
			)}**:*\n${actualContent}`;
		}
		case MessageType.ChatInputCommand: {
			if (!replies) return actualContent;
			return `*${message.interaction?.user.toString() ?? ""} used **/${escapeMessage(
				message.interaction?.commandName ?? "",
			)}**:*\n${actualContent}`;
		}
		case MessageType.Call: {
			return CONSTANTS.emojis.discord.call + `${message.author.toString()} started a call.`;
		}
		default: {
			// Fallback for unknown message types
			throw new TypeError("Unknown message type: " + message.type);
		}
	}
}

/**
 * @param {import("discord.js").Message} message
 * @param {Readonly<import("discord.js").EmojiIdentifierResolvable[]>} reactions
 */
export async function reactAll(message, reactions) {
	for (const reaction of reactions) {
		await message.react(reaction);
	}
}

/**
 * @template {{ [key: string]: any }} T
 *
 * @param {T[]} array
 * @param {(value: T, index: number, array: (T | undefined)[]) => string} toString
 * @param {string} failMessage
 * @param {string} title
 * @param {(options: import("discord.js").BaseMessageOptions & { fetchReply: true }) => Promise<import("discord.js").Message>} reply
 */

export async function paginate(array, toString, failMessage, title, reply) {
	const PAGE_OFFSET = 15;
	const previousId = generateHash("previous");
	const previousButton = new ButtonBuilder()
		.setLabel("<< Previous")
		.setStyle(ButtonStyle.Primary)
		.setDisabled(true)
		.setCustomId(previousId);
	const numberOfPages = Math.ceil(array.length / PAGE_OFFSET);
	const nextId = generateHash("next");
	const nextButton = new ButtonBuilder()
		.setLabel("Next >>")
		.setStyle(ButtonStyle.Primary)
		.setDisabled(numberOfPages === 1)
		.setCustomId(nextId);

	// eslint-disable-next-line fp/no-let -- This must be changable.
	let offset = 0;

	/**
	 * Generate an embed that has the next page.
	 *
	 * @returns {import("discord.js").InteractionReplyOptions & { fetchReply: true }} - EmbedBuilder with the next page.
	 */
	function generateMessage() {
		const content = array
			.filter((_, index) => index >= offset && index < offset + PAGE_OFFSET)
			.map((current, index, all) => `${index + offset + 1}) ${toString(current, index, all)}`)
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
			components: [new MessageActionRowBuilder().addComponents(previousButton, nextButton)],

			embeds: [
				new EmbedBuilder()
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

	const collector =
		message.embeds[0] &&
		message.createMessageComponentCollector({
			filter: (buttonInteraction) =>
				[previousId, nextId].includes(buttonInteraction.customId) &&
				buttonInteraction.user.id === message.interaction?.user.id,

			time: CONSTANTS.collectorTime,
		});

	collector
		?.on("collect", async (buttonInteraction) => {
			if (buttonInteraction.customId === nextId) offset += PAGE_OFFSET;
			else offset -= PAGE_OFFSET;

			previousButton.setDisabled(offset === 0);
			nextButton.setDisabled(offset + PAGE_OFFSET >= array.length - 1);
			message = await reply(generateMessage());
			await buttonInteraction.deferUpdate();
			collector.resetTimer();
		})
		.on("end", async () => {
			await reply({ components: disableComponents(message.components), fetchReply: true });
		});
}

/** @param {ActionRow<import("discord.js").MessageActionRowComponent>[]} row */
export function disableComponents(row) {
	return row.map(({ components }) =>
		new MessageActionRowBuilder().setComponents(
			components.map((component) => {
				if (component.type === ComponentType.Button) {
					const button = ButtonBuilder.from(component);
					if (button.data.style !== ButtonStyle.Link) button.setDisabled(true);
					return button;
				}

				return SelectMenuBuilder.from(component).setDisabled(true);
			}),
		),
	);
}

/**
 * @param {null | undefined | import("discord.js").Channel} channel
 *
 * @returns {| import("discord.js").DMChannel
 * 	| import("discord.js").PartialDMChannel
 * 	| import("discord.js").PartialGroupDMChannel
 * 	| import("discord.js").NonThreadGuildBasedChannel
 * 	| undefined}
 */
export function getBaseChannel(channel) {
	const nonThread = channel?.isThread() ? channel.parent : channel;
	return nonThread && !nonThread.isThread() ? nonThread : undefined;
}
