import {
	ActionRow,
	ButtonStyle,
	Colors,
	ComponentType,
	Message,
	MessageType,
	ChannelType,
	Attachment,
	User,
	APIActionRowComponent,
	APIEmbed,
	APIMessageActionRowComponent,
	Awaitable,
	BaseMessageOptions,
	DMChannel,
	EmojiIdentifierResolvable,
	GuildTextBasedChannel,
	InteractionReplyOptions,
	MessageActionRowComponent,
	MessageEditOptions,
	NonThreadGuildBasedChannel,
	PartialDMChannel,
	Snowflake,
	TextBasedChannel,
	MessageActionRowComponentData,
	ActionRowData,
	GuildMember,
} from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { escapeMessage, escapeLinks, stripMarkdown } from "./markdown.js";
import { generateHash, truncateText } from "./text.js";
import { censor } from "../common/automod.js";

export async function extractMessageExtremities(
	message: Message,
	allowLanguage = true,
): Promise<{ embeds: APIEmbed[]; files: Attachment[] }> {
	const embeds = [
		...message.stickers
			.filter((sticker) => {
				return allowLanguage || !censor(sticker.name);
			})
			.map((sticker) => ({ image: { url: sticker.url }, color: Colors.Blurple })),
		...message.embeds
			.filter((embed) => !embed.video)
			.map(({ data }) => {
				if (allowLanguage) return data;

				const newEmbed = { ...data };

				if (newEmbed.description) {
					const censored = censor(newEmbed.description);

					if (censored) newEmbed.description = censored.censored;
				}

				if (newEmbed.title) {
					const censored = censor(newEmbed.title);

					if (censored) newEmbed.title = censored.censored;
				}

				if (newEmbed.url && censor(newEmbed.url)) newEmbed.url = "";

				if (newEmbed.image?.url && censor(newEmbed.image.url)) newEmbed.image = undefined;

				if (newEmbed.thumbnail?.url && censor(newEmbed.thumbnail.url))
					newEmbed.thumbnail = undefined;

				if (newEmbed.footer?.text) {
					const censored = censor(newEmbed.footer.text);

					if (censored) {
						newEmbed.footer.text = censored.censored;
					}
				}

				if (newEmbed.author) {
					const censoredName = censor(newEmbed.author.name);
					const censoredUrl = newEmbed.author.url && censor(newEmbed.author.url);

					if (censoredName) {
						newEmbed.author.name = censoredName.censored;
					}
					if (censoredUrl) {
						newEmbed.author.url = "";
					}
				}

				newEmbed.fields = (newEmbed.fields || []).map((field) => {
					const censoredName = censor(field.name);
					const censoredValue = censor(field.value);
					return {
						name: censoredName ? censoredName.censored : field.name,
						value: censoredValue ? censoredValue.censored : field.value,
						inline: field.inline,
					};
				});

				return newEmbed;
			}),
	];

	while (embeds.length > 10) embeds.pop();

	return { embeds, files: message.attachments.toJSON() };
}

export function getMessageJSON(message: Message): MessageEditOptions {
	return {
		components: message.components.map((component) => component.toJSON()),
		content: message.content,
		embeds: message.embeds.map((embed) => embed.toJSON()),
		files: message.attachments.map((attachment) => attachment.url),
	};
}

/**
 * Get all messages from a channel.
 *
 * @deprecated Too laggy.
 *
 * @param channel The channel to fetch messages from.
 *
 * @returns The messages.
 */
export async function getAllMessages<
	T extends Message<C extends GuildTextBasedChannel ? true : false>,
	C extends TextBasedChannel,
>(channel: C): Promise<T[]> {
	const messages: T[] = [];

	// eslint-disable-next-line fp/no-let -- This needs to be changable
	let lastId: Snowflake | undefined;

	do {
		// eslint-disable-next-line no-await-in-loop -- We can’t use `Promise.all` here
		const fetchedMessages = await channel.messages.fetch({ before: lastId, limit: 100 });

		// @ts-expect-error -- This is the right type.
		messages.push(...fetchedMessages.toJSON());
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
 * @param message - Message to convert.
 *
 * @returns Text representation of the message.
 *
 * @todo Better `replies`
 */
export async function messageToText(message: Message, replies = true): Promise<string> {
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
					message.channel.isThread() &&
					message.channel.parent?.type === ChannelType.GuildForum
						? "post title"
						: "channel name"
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
			return (
				CONSTANTS.emojis.discord.no +
				" This server has been removed from Server Discovery because it no longer passes all the requirements. Check Server Settings for more details."
			);
		}
		case MessageType.GuildDiscoveryRequalified: {
			return (
				CONSTANTS.emojis.discord.yes +
				" This server is eligible for Server Discovery again and has been automatically relisted!"
			);
		}
		case MessageType.GuildDiscoveryGracePeriodInitialWarning: {
			return (
				CONSTANTS.emojis.discord.warning +
				" This server has failed Discovery activity requirements for 1 week. If this server fails for 4 weeks in a row, it will be automatically removed from Discovery."
			);
		}
		case MessageType.GuildDiscoveryGracePeriodFinalWarning: {
			return (
				CONSTANTS.emojis.discord.warning +
				" This server has failed Discovery activity requirements for 3 weeks in a row. If this server fails for 1 more week, it will be removed from Discovery."
			);
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
					cleanContent ? `:*\n> ${truncateText(stripMarkdown(cleanContent), 300)}` : "*"
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
			// TODO: this probably needs an emoji
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
			// TODO: automoderationaction
			throw new TypeError("Unknown message type: " + message.type);
		}
	}
}

export async function reactAll(message: Message, reactions: Readonly<EmojiIdentifierResolvable[]>) {
	for (const reaction of reactions) {
		await message.react(reaction);
	}
}

export async function paginate<Item, FormatFromUser extends boolean, Interaction extends boolean>(
	array: Item[],
	toString: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	reply: (
		options: (Interaction extends true ? InteractionReplyOptions : BaseMessageOptions) & {
			fetchReply: true;
		},
	) => Promise<Message>,
	{
		title,
		user,
		singular,
		plural = `${singular}s`,
		failMessage = `No ${plural} found!`,
		formatFromUser, // Implicitly defaults to false
		ephemeral, // Implicitly defaults to false
		rawOffset = 0,
		itemsPerPage = 15,
		count = true,
		generateComponents,
		disableCustomComponents = false,
	}: {
		title: string;
		user: FormatFromUser extends true ? GuildMember | User : User;
		singular: string;
		plural?: string;
		failMessage?: string;
		formatFromUser?: FormatFromUser;
		ephemeral?: Interaction extends true ? boolean : undefined;
		rawOffset?: number;
		itemsPerPage?: number;
		count?: boolean;
		generateComponents?: (filtered: Item[]) => MessageActionRowComponentData[];
		disableCustomComponents?: boolean;
	},
) {
	const previousId = generateHash("previous");
	const nextId = generateHash("next");
	const numberOfPages = Math.ceil(array.length / itemsPerPage);

	// eslint-disable-next-line fp/no-let -- This must be changable.
	let offset = Math.floor(rawOffset / itemsPerPage) * itemsPerPage;

	/**
	 * Generate an embed that has the next page.
	 *
	 * @returns The next page.
	 */
	async function generateMessage(): Promise<InteractionReplyOptions & { fetchReply: true }> {
		const filtered = array.filter(
			(_, index) => index >= offset && index < offset + itemsPerPage,
		);

		const content = (
			await Promise.all(
				filtered.map(
					async (current, index, all) =>
						`${count ? `${index + offset + 1}) ` : ""}${await toString(
							current,
							index,
							all,
						)}`,
				),
			)
		)
			.join("\n")
			.trim();

		if (!content) {
			return {
				content: `${CONSTANTS.emojis.statuses.no} ${failMessage}`,
				ephemeral: true,
				fetchReply: true,
			} as const;
		}

		const components: ActionRowData<MessageActionRowComponentData>[] =
			numberOfPages > 1
				? [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									label: "<< Previous",
									style: ButtonStyle.Primary,
									disabled: offset === 0,
									customId: previousId,
								},
								{
									type: ComponentType.Button,
									label: "Next >>",
									style: ButtonStyle.Primary,
									disabled: offset + itemsPerPage >= array.length,
									customId: nextId,
								},
							],
						},
				  ]
				: [];

		if (generateComponents) {
			components.push({
				type: ComponentType.ActionRow,
				components: generateComponents(filtered),
			});
		}

		return {
			components,

			embeds: [
				{
					title: title,
					description: content,
					footer: {
						text: `Page ${offset / itemsPerPage + 1}/${numberOfPages}${
							CONSTANTS.footerSeperator
						}${array.length} ${array.length === 1 ? singular : plural}`,
					},
					author: formatFromUser
						? {
								icon_url: user.displayAvatarURL(),
								name:
									user instanceof GuildMember ? user.displayName : user.username,
						  }
						: undefined,
					color: formatFromUser
						? user instanceof GuildMember
							? user.displayColor
							: undefined
						: CONSTANTS.themeColor,
				},
			],
			ephemeral: !!ephemeral,
			fetchReply: true,
		};
	}

	let message = await reply(await generateMessage());
	if (numberOfPages === 1) return;

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) =>
			[previousId, nextId].includes(buttonInteraction.customId) &&
			buttonInteraction.user.id === user.id,

		time: CONSTANTS.collectorTime,
	});

	collector
		?.on("collect", async (buttonInteraction) => {
			if (buttonInteraction.customId === nextId) offset += itemsPerPage;
			else offset -= itemsPerPage;

			await buttonInteraction.deferUpdate();
			message = await reply(await generateMessage());
			collector.resetTimer();
		})
		.on("end", async () => {
			const [pagination, ...rest] = message.components;
			await reply({
				components:
					disableCustomComponents || !pagination
						? disableComponents(message.components)
						: [...disableComponents([pagination]), ...rest],
				fetchReply: true,
			});
		});
}

export function disableComponents(
	rows: ActionRow<MessageActionRowComponent>[],
): APIActionRowComponent<APIMessageActionRowComponent>[] {
	return rows.map(({ components }) => ({
		type: ComponentType.ActionRow,
		components: components.map((component) => {
			return {
				...component.data,
				disabled:
					component.type === ComponentType.Button
						? component.style !== ButtonStyle.Link
						: true,
			};
		}),
	}));
}

export function getBaseChannel(
	channel?: null | TextBasedChannel,
): DMChannel | PartialDMChannel | NonThreadGuildBasedChannel | undefined {
	const nonThread = channel?.isThread() ? channel.parent : channel;
	return nonThread && !nonThread.isThread() ? nonThread : undefined;
}
