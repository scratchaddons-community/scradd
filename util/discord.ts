import {
	type ActionRow,
	ButtonStyle,
	Colors,
	ComponentType,
	Message,
	MessageType,
	type Attachment,
	type User,
	type APIActionRowComponent,
	type APIEmbed,
	type APIMessageActionRowComponent,
	type Awaitable,
	type InteractionReplyOptions,
	type EmojiIdentifierResolvable,
	type GuildTextBasedChannel,
	type MessageActionRowComponent,
	type MessageEditOptions,
	type Snowflake,
	type TextBasedChannel,
	type MessageActionRowComponentData,
	type ActionRowData,
	GuildMember,
	FormattingPatterns,
	MessageMentions,
	type AnyThreadChannel,
	chatInputApplicationCommandMention,
	type DMChannel,
	type PartialDMChannel,
	bold,
	type ChatInputCommandInteraction,
	InteractionResponse,
	type ThreadChannel,
	channelMention,
	type APIEmbedField,
	type Guild,
	messageLink,
	MessageFlags,
	hyperlink,
	type MessageReaction,
	type Channel,
} from "discord.js";
import constants from "../common/constants.js";
import { escapeMessage, stripMarkdown } from "./markdown.js";
import { generateHash, truncateText } from "./text.js";
import { client } from "strife.js";

/**
 * Extract extremities (embeds, stickers, and attachments) from a message.
 *
 * @param message - The message to extract extremeties from.
 * @param tryCensor - Function to censor bad words. Omit to not censor.
 */
export function extractMessageExtremities(
	message: Message,
	tryCensor?: (text: string) => false | { censored: string; strikes: number; words: string[][] },
): { embeds: APIEmbed[]; files: Attachment[] } {
	const embeds = [
		...message.stickers
			.filter((sticker) => !tryCensor?.(sticker.name))
			.map(
				(sticker): APIEmbed => ({
					color: Colors.Blurple,
					image: { url: sticker.url },
					footer: { text: sticker.name },
				}),
			),
		...message.embeds
			.filter((embed) => !embed.video && !message.flags.has(MessageFlags.SuppressEmbeds))
			.map(({ data }): APIEmbed => {
				const automodInfo = (data.fields ?? []).reduce(
					(accumulator, field) => ({ ...accumulator, [field.name]: field.value }),
					{
						flagged_message_id: message.id,
						channel_id: message.channel.id,
						keyword: "",
						rule_name: "",
					},
				);

				const newEmbed =
					message.type === MessageType.AutoModerationAction
						? {
								description: data.description ?? message.content,
								color: message.member?.displayColor ?? data.color,
								author: {
									icon_url: (message.member ?? message.author).displayAvatarURL(),
									name: (message.member ?? message.author).displayName,
								},
								url: messageLink(
									message.guild?.id ?? "@me",
									automodInfo.channel_id,
									automodInfo.flagged_message_id,
								),
								footer: {
									text: `${
										automodInfo.keyword && `Keyword: ${automodInfo.keyword}`
									}${
										automodInfo.keyword &&
										automodInfo.rule_name &&
										constants.footerSeperator
									}${automodInfo.rule_name && `Rule: ${automodInfo.rule_name}`}`,
								},
						  }
						: { ...data };

				if (!tryCensor) return newEmbed;

				if (newEmbed.description) {
					const censored = tryCensor(newEmbed.description);
					if (censored) newEmbed.description = censored.censored;
				}

				if (newEmbed.title) {
					const censored = tryCensor(newEmbed.title);
					if (censored) newEmbed.title = censored.censored;
				}

				if (newEmbed.url && tryCensor(newEmbed.url)) newEmbed.url = "";

				if (newEmbed.image?.url && tryCensor(newEmbed.image.url))
					newEmbed.image = undefined;

				if (newEmbed.thumbnail?.url && tryCensor(newEmbed.thumbnail.url))
					newEmbed.thumbnail = undefined;

				if (newEmbed.footer?.text) {
					const censored = tryCensor(newEmbed.footer.text);
					if (censored) newEmbed.footer.text = censored.censored;
				}

				if (newEmbed.author) {
					const censoredName = tryCensor(newEmbed.author.name);
					if (censoredName) newEmbed.author.name = censoredName.censored;

					const censoredUrl = newEmbed.author.url && tryCensor(newEmbed.author.url);
					if (censoredUrl) newEmbed.author.url = "";
				}

				newEmbed.fields = (newEmbed.fields ?? []).map((field) => {
					const censoredName = tryCensor(field.name);
					const censoredValue = tryCensor(field.value);
					return {
						inline: field.inline,
						name: censoredName ? censoredName.censored : field.name,
						value: censoredValue ? censoredValue.censored : field.value,
					};
				});

				return newEmbed;
			}),
	];

	return { embeds: embeds.slice(0, 10), files: [...message.attachments.values()] };
}

/**
 * Converts a message to a JSON object describing it.
 *
 * @param message - The message to convert.
 *
 * @returns The JSON.
 */
export function getMessageJSON(message: Message): {
	components: APIActionRowComponent<APIMessageActionRowComponent>[];
	content: string;
	embeds: APIEmbed[];
	files: string[];
} {
	return {
		components: message.components.map((component) => component.toJSON()),
		content: message.content,
		embeds: message.embeds.map((embed) => embed.toJSON()),
		files: message.attachments.map((attachment) => attachment.url),
	} satisfies MessageEditOptions;
}

/**
 * Get all messages from a channel.
 *
 * @param channel - The channel to fetch messages from.
 *
 * @returns The messages.
 */
export async function getAllMessages(
	channel: GuildTextBasedChannel | ThreadChannel,
): Promise<Message<true>[]>;
export async function getAllMessages(
	channel: DMChannel | PartialDMChannel,
): Promise<Message<false>[]>;
export async function getAllMessages(
	channel: TextBasedChannel | ThreadChannel,
): Promise<Message[]> {
	const messages = [];

	let lastId: Snowflake | undefined;

	do {
		const fetchedMessages = await channel.messages.fetch({ before: lastId, limit: 100 });

		messages.push(...fetchedMessages.values());
		lastId = fetchedMessages.lastKey();
	} while (lastId);

	return messages;
}

/**
 * A property that returns the content that is rendered regardless of the {@link Message.type}. In some cases, this just returns the regular
 * {@link Message.content}. Otherwise this returns an English message denoting the contents of the system message.
 *
 * @author Based Off of [Rapptz/discord.py’s
 *   `system_content`](https://github.com/Rapptz/discord.py/blob/08ef42f/discord/message.py#L2080-L2234)
 * @param message - Message to convert.
 * @param replies - Whether to quote replies.
 *
 * @returns Text representation of the message.
 */
export function messageToText(message: Message, replies: false): string;
export async function messageToText(message: Message, replies?: true): Promise<string>;
export function messageToText(message: Message, replies = true): Awaitable<string> {
	const content = message.flags.has("Loading")
		? (Date.now() - message.createdTimestamp) / 1000 / 60 > 15
			? `${constants.emojis.message.error} The application did not respond`
			: `${constants.emojis.misc.loading} ${escapeMessage(
					message.author.displayName,
					// eslint-disable-next-line unicorn/string-content
			  )} is thinking...`
		: message.content;

	switch (message.type) {
		case MessageType.Default: {
			break;
		}

		case MessageType.RecipientAdd: {
			return `${constants.emojis.message.add} ${message.author.toString()} added ${
				message.mentions.users.first()?.toString() ?? "**Unknown User**"
			} to the ${message.channel.isThread() ? "thread" : "group"}.`;
		}

		case MessageType.RecipientRemove: {
			const ping = message.mentions.users.first();
			return `${constants.emojis.message.remove} ${message.author.toString()} ${
				ping ? `removed ${ping.toString()} from` : "left"
			} the ${message.channel.isThread() ? "thread" : "group"}.`;
		}

		case MessageType.Call: {
			return `${constants.emojis.message.call} ${message.author.toString()} started a call.`;
		}

		case MessageType.ChannelNameChange: {
			return `${constants.emojis.message.edit} ${message.author.toString()} changed the ${
				message.channel.isThread() && message.channel.parent?.isThreadOnly()
					? "post title"
					: "channel name"
			}: **${escapeMessage(content)}**`;
		}

		case MessageType.ChannelIconChange: {
			return `${
				constants.emojis.message.edit
			} ${message.author.toString()} changed the group icon.`;
		}

		case MessageType.ChannelPinnedMessage: {
			if (!replies)
				return `${
					constants.emojis.message.pin
				} ${message.author.toString()} pinned **a message** to this channel. See all **pinned messages**.`;

			return `${
				constants.emojis.message.pin
			} ${message.author.toString()} pinned [a message](<${message.url.replace(
				message.id,
				message.reference?.messageId || message.id,
			)}>) to this channel. See all [pinned messages](<${message.channel.url}>).`;
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
				// eslint-disable-next-line unicorn/string-content
				`Glad you're here, ${message.author.toString()}.`,
				`Good to see you, ${message.author.toString()}.`,
				`Yay you made it, ${message.author.toString()}!`,
			] as const;

			return `${constants.emojis.message.add} ${
				formats[message.createdTimestamp % formats.length] ?? formats[0]
			}`;
		}

		case MessageType.GuildBoost: {
			return `${
				constants.emojis.message.boost
			} ${message.author.toString()} just boosted the server${
				content && ` **${escapeMessage(content)}** times`
			}!`;
		}

		case MessageType.GuildBoostTier1: {
			return `${
				constants.emojis.message.boost
			} ${message.author.toString()} just boosted the server${
				content && ` **${escapeMessage(content)}** times`
			}! ${escapeMessage(message.guild?.name ?? "")} has achieved **Level 1**!`;
		}

		case MessageType.GuildBoostTier2: {
			return `${
				constants.emojis.message.boost
			} ${message.author.toString()} just boosted the server${
				content && ` **${escapeMessage(content)}** times`
			}! ${escapeMessage(message.guild?.name ?? "")} has achieved **Level 2**!`;
		}

		case MessageType.GuildBoostTier3: {
			return `${
				constants.emojis.message.boost
			} ${message.author.toString()} just boosted the server${
				content && ` **${escapeMessage(content)}** times`
			}! ${escapeMessage(message.guild?.name ?? "")} has achieved **Level 3**!`;
		}

		case MessageType.ChannelFollowAdd: {
			return `${
				constants.emojis.message.add
			} ${message.author.toString()} has added **${escapeMessage(
				content,
			)}** to this channel. Its most important updates will show up here.`;
		}

		case MessageType.GuildDiscoveryDisqualified: {
			return `${
				constants.emojis.message.fail
			} This server has been removed from Server Discovery because it no longer passes all the requirements. Check [Server Settings](discord://-/guilds/${
				message.guild?.id ?? "@me"
			}/settings/discovery) for more details.`;
		}

		case MessageType.GuildDiscoveryRequalified: {
			return `${constants.emojis.message.success} This server is eligible for Server Discovery again and has been automatically relisted!`;
		}

		case MessageType.GuildDiscoveryGracePeriodInitialWarning: {
			return `${constants.emojis.message.warning} This server has failed Discovery activity requirements for 1 week. If this server fails for 4 weeks in a row, it will be automatically removed from Discovery.`;
		}

		case MessageType.GuildDiscoveryGracePeriodFinalWarning: {
			return `${constants.emojis.message.warning} This server has failed Discovery activity requirements for 3 weeks in a row. If this server fails for 1 more week, it will be removed from Discovery.`;
		}

		case MessageType.ThreadCreated: {
			return `${
				constants.emojis.message.thread
			} ${message.author.toString()} started a thread: [${escapeMessage(
				content,
			)}](<${message.channel.url.replace(
				message.channel.id,
				message.reference?.channelId ?? message.channel.id,
			)}>) See all [threads](<${message.channel.url}>).`;
		}

		case MessageType.Reply: {
			if (!replies) break;
			return message
				.fetchReference()
				.catch(() => void 0)
				.then((reply) => {
					const cleanContent =
						reply && messageToText(reply, false).replaceAll(/\s+/g, " ");
					return `[*${
						reply
							? `Replying to ${reply.author.toString()}${cleanContent ? `:` : ""}`
							: `${constants.emojis.message.reply} Original message was deleted`
					}*](${messageLink(
						message.reference?.guildId ?? message.guild?.id ?? "@me",
						message.reference?.channelId ?? message.channel.id,
						message.reference?.messageId ?? message.id,
					)})${
						cleanContent ? `\n> ${truncateText(stripMarkdown(cleanContent), 300)}` : ""
					}\n\n${content}`;
				});
		}

		case MessageType.ChatInputCommand: {
			if (!replies || !message.interaction) break;

			const userPing = message.interaction.user.toString();
			return mentionChatCommand(
				message.interaction.commandName,
				message.guild ?? undefined,
			).then(
				(formatted) => `*${userPing} used ${formatted}${content ? `:*\n${content}` : "*"}`,
			);
		}

		case MessageType.ThreadStarterMessage: {
			// eslint-disable-next-line unicorn/string-content
			const failMessage = `${constants.emojis.message.thread} Sorry, we couldn't load the first message in this thread`;
			if (!message.reference) return failMessage;

			if (!replies) break;

			return message
				.fetchReference()
				.catch(() => void 0)
				.then(async (reference) =>
					reference ? (await messageToText(reference, replies)) || content : failMessage,
				);
		}

		case MessageType.GuildInviteReminder: {
			return "Wondering who to invite?\nStart by inviting anyone who can help you build the server!";
		}

		case MessageType.ContextMenuCommand: {
			if (!replies || !message.interaction) break;
			return `*${message.interaction.user.toString()} used **${escapeMessage(
				message.interaction.commandName,
			)}**${content ? `:*\n${content}` : "*"}`;
		}

		case MessageType.AutoModerationAction: {
			return `**AutoMod** 🤖 has ${
				message.embeds[0]?.fields.find(({ name }) => name === "flagged_message_id")
					? "flagged"
					: "blocked"
			} a message in ${channelMention(
				message.embeds[0]?.fields.find(({ name }) => name === "channel_id")?.value ??
					message.channel.id,
			)}`;
		}

		case MessageType.RoleSubscriptionPurchase: {
			if (!message.roleSubscriptionData) return "";

			const {
				totalMonthsSubscribed: months,
				isRenewal,
				tierName,
			} = message.roleSubscriptionData;
			return (
				`${constants.emojis.message.add} ${message.author.toString()} ${
					isRenewal ? "renewed" : "joined"
				} **${tierName}** ${months ? "and has been" : "as"} a subscriber of ` +
				hyperlink(
					escapeMessage(message.guild?.name ?? ""),
					`discord://-/channels/${message.guild?.id ?? "@me"}/role-subscriptions`,
				) +
				(months ? ` for ${months} month${months === 1 ? "" : "s"}!` : `!`)
			);
		}

		case MessageType.InteractionPremiumUpsell: {
			break;
		}

		case MessageType.StageStart: {
			return `${
				constants.emojis.message.live
			} ${message.author.toString()} started **${content}**`;
		}

		case MessageType.StageEnd: {
			return `${
				constants.emojis.message.stage
			} ${message.author.toString()} ended **${content}**`;
		}

		case MessageType.StageSpeaker: {
			return `${
				constants.emojis.message.speaker
			} ${message.author.toString()} is now a speaker.`;
		}

		case MessageType.StageRaiseHand: {
			return `${
				constants.emojis.message.raisedHand
			} ${message.author.toString()} requested to speak.`;
		}

		case MessageType.StageTopic: {
			return `${
				constants.emojis.message.stage
			} ${message.author.toString()} changed the Stage topic: **${content}**`;
		}

		case MessageType.GuildApplicationPremiumSubscription: {
			return `${
				constants.emojis.message.subscription
			} ${message.author.toString()} upgraded ${
				message.groupActivityApplication?.name ?? `a deleted application`
			} to premium for this server! 🎉`;
		}
	}

	return content;
}

export async function messageToEmbed(
	message: Message,
	censor = (text: string) => text,
): Promise<APIEmbed> {
	const lines = (await messageToText(message)).split("\n");
	const content =
		message.type === MessageType.GuildInviteReminder ? lines[1] ?? "" : lines.join("\n");
	const author =
		message.type === MessageType.AutoModerationAction
			? content
			: message.type === MessageType.GuildInviteReminder
			? lines[0] + " 🤖"
			: (message.member ?? message.author).displayName +
			  (message.author.bot || message.webhookId ? " 🤖" : "");
	return {
		color:
			message.type === MessageType.AutoModerationAction
				? 0x99_a1_f2
				: message.type === MessageType.GuildInviteReminder
				? undefined
				: message.member?.displayColor,
		description: message.type === MessageType.AutoModerationAction ? "" : censor(content),

		author: {
			icon_url:
				message.type === MessageType.AutoModerationAction
					? "https://discord.com/assets/e7af5fc8fa27c595d963c1b366dc91fa.gif"
					: message.type === MessageType.GuildInviteReminder
					? "https://discord.com/assets/e4c6bb8de56c299978ec36136e53591a.svg"
					: (message.member ?? message.author).displayAvatarURL(),

			name: censor(author),
		},

		timestamp:
			message.type === MessageType.GuildInviteReminder
				? undefined
				: message.createdAt.toISOString(),

		footer: message.editedAt ? { text: "Edited" } : undefined,
	};
}

/**
 * React with multiple emojis to a message, one at a time & in order.
 *
 * @param message - The message to react to.
 * @param reactions - The reactions to add.
 *
 * @returns The added reactions.
 */
export async function reactAll(
	message: Message,
	reactions: Readonly<EmojiIdentifierResolvable[]>,
): Promise<MessageReaction[]> {
	const messageReactions = [];
	for (const reaction of reactions) {
		const messageReaction = await message.react(reaction).catch(() => void 0);
		if (messageReaction) messageReactions.push(messageReaction);
		else break;
	}
	return messageReactions;
}

/**
 * Disables components on passed action rows. Ignores buttons with a link.
 *
 * @param rows - The action rows to disable components on.
 *
 * @returns The action rows with disabled components.
 */
export function disableComponents(
	rows: ActionRow<MessageActionRowComponent>[],
): APIActionRowComponent<APIMessageActionRowComponent>[] {
	return rows.map(({ components }) => ({
		components: components.map((component) => ({
			...component.data,

			disabled:
				component.type !== ComponentType.Button || component.style !== ButtonStyle.Link,
		})),

		type: ComponentType.ActionRow,
	}));
}

type PaginateOptions<Item, U extends User | false = User | false> = {
	title: string;
	format?: GuildMember | User;
	singular: string;
	plural?: string;
	failMessage?: string;

	user: U;
	rawOffset?: number;
	highlightOffset?: boolean;
	totalCount?: number;
	ephemeral?: boolean;
	perPage?: number;

	generateComponents?(items: Item[]): Awaitable<MessageActionRowComponentData[] | undefined>;
	customComponentLocation?: "above" | "below";
};

/**
 * Creates a paginated embed from an array.
 *
 * @param array - The array to be paginated.
 * @param toString - A function to convert each element of the array to a string.
 * @param reply - A function to send pages.
 * @param options - Additional options.
 * @param options.title - The title of the embed.
 * @param options.format - A user to format the embed against.
 * @param options.singular - A noun that describes a item of the array.
 * @param options.plural - `singular` pluralized. Defaults to just adding an `s` to the end.
 * @param options.failMessage - A message to show when `array` is empty.
 * @param options.user - The user who ran the command. Only they will be able to switch pages. Set to `false` to only show the first page.
 * @param options.rawOffset - The index of an item to jump to.
 * @param options.totalCount - Whether to show the index of each item.
 * @param options.generateComponents - A function to generate custom action rows below the pagination buttons on a per-page basis.
 * @param options.disableCustomComponents - Whether to disable the custom components when the pagination buttons go inactive.
 */
export async function paginate<Item>(
	array: Item[],
	toString: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	reply: (options: InteractionReplyOptions) => Promise<InteractionResponse | Message>,
	options: PaginateOptions<Item, User>,
): Promise<void>;
export async function paginate<Item>(
	array: Item[],
	toString: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	reply: (options: InteractionReplyOptions) => unknown,
	options: PaginateOptions<Item, false>,
): Promise<void>;
export async function paginate<Item>(
	array: Item[],
	toString: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	reply: (options: InteractionReplyOptions) => Awaitable<unknown>,
	{
		title,
		format,
		singular,
		plural = `${singular}s`,
		failMessage = `No ${plural} found! Try changing any filters you may have used.`,

		user,
		rawOffset,
		highlightOffset = false,
		totalCount,
		ephemeral = false,
		perPage = 20,

		generateComponents,
		customComponentLocation = "above",
	}: PaginateOptions<Item>,
): Promise<void> {
	if (!array.length) {
		await reply({ content: `${constants.emojis.statuses.no} ${failMessage}`, ephemeral: true });
		return;
	}

	const previousId = generateHash("previous");
	const nextId = generateHash("next");
	const numberOfPages = Math.ceil(array.length / perPage);

	let offset = Math.floor((rawOffset ?? 0) / perPage) * perPage;

	/**
	 * Generate an embed that has the next page.
	 *
	 * @returns The next page.
	 */
	async function generateMessage(): Promise<InteractionReplyOptions> {
		const filtered = array.filter((_, index) => index >= offset && index < offset + perPage);

		const content = (
			await Promise.all(
				filtered.map(async (current, index) => {
					const line =
						(totalCount ? "" : `${index + offset + 1}. `) +
						(await toString(current, index, filtered));
					return highlightOffset && rawOffset === index + offset ? `__${line}__` : line;
				}),
			)
		).join("\n");

		const components: ActionRowData<MessageActionRowComponentData>[] =
			numberOfPages > 1 && user
				? [
						{
							type: ComponentType.ActionRow,

							components: [
								{
									type: ComponentType.Button,
									label: "<< Previous",
									style: ButtonStyle.Primary,
									disabled: offset < 1,
									customId: previousId,
								},
								{
									type: ComponentType.Button,
									label: "Next >>",
									style: ButtonStyle.Primary,
									disabled: offset + perPage >= array.length,
									customId: nextId,
								},
							],
						},
				  ]
				: [];

		if (generateComponents) {
			const extraComponents = await generateComponents(filtered);
			if (extraComponents?.length)
				components[customComponentLocation === "above" ? "unshift" : "push"]({
					type: ComponentType.ActionRow,
					components: extraComponents,
				});
		}

		const count = totalCount ?? array.length;

		return {
			components,
			embeds: [
				{
					title,
					description: content,

					footer: {
						text: `Page ${offset / perPage + 1}/${numberOfPages}${
							constants.footerSeperator
						}${count.toLocaleString()} ${count === 1 ? singular : plural}`,
					},

					author: format
						? { icon_url: format.displayAvatarURL(), name: format.displayName }
						: undefined,

					color: format
						? format instanceof GuildMember
							? format.displayColor
							: undefined
						: constants.themeColor,
				},
			],
			ephemeral,
		};
	}

	let message = await reply(await generateMessage());
	if (
		numberOfPages === 1 ||
		!user ||
		!(message instanceof InteractionResponse || message instanceof Message)
	)
		return;

	const editReply = (data: InteractionReplyOptions): unknown =>
		ephemeral || !(message instanceof InteractionResponse) || !(message instanceof Message)
			? reply(data)
			: message.edit(data);

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) =>
			[previousId, nextId].includes(buttonInteraction.customId) &&
			buttonInteraction.user.id === user.id,

		idle: constants.collectorTime,
		time: ephemeral ? (14 * 60 + 50) * 1000 : undefined,
	});

	collector
		.on("collect", async (buttonInteraction) => {
			if (buttonInteraction.customId === nextId) offset += perPage;
			else offset -= perPage;

			await buttonInteraction.deferUpdate();
			message = await editReply(await generateMessage());
		})
		.on("end", async () => {
			const [pagination, ...rest] = message instanceof Message ? message.components : [];
			await editReply({
				components: pagination ? [...disableComponents([pagination]), ...rest] : [],
				ephemeral,
			});
		});
}

export function getBaseChannel<TChannel extends Channel | null | undefined>(
	channel: TChannel,
): TChannel extends null
	? undefined
	: TChannel extends AnyThreadChannel
	? NonNullable<TChannel["parent"]> | undefined
	: TChannel {
	// @ts-expect-error TS2322
	return (channel && (channel.isThread() ? channel.parent : channel)) || undefined;
}

/** A global regular expression variant of {@link MessageMentions.UsersPattern}. */
export const GlobalUsersPattern = new RegExp(MessageMentions.UsersPattern, "g");

/** An enhanced variant of {@link Invite.InvitesPattern}. */
export const InvitesPattern =
	/discord(?:(?:(?:app)?\.com|:\/(?:\/-?)?)\/invite|\.gg(?:\/invite)?)\/(?<code>[\w-]{2,255})/gi;

/** A global regular expression variant of {@link FormattingPatterns.AnimatedEmoji}. */
export const GlobalAnimatedEmoji = new RegExp(FormattingPatterns.AnimatedEmoji, "g");

export const BotInvitesPattern = /discord(?:app)?\.com\/(?:api\/)?oauth2\/authorize/i;

/** A global regular expression variant of {@link BotInvitesPattern}. */
export const GlobalBotInvitesPattern = new RegExp(BotInvitesPattern, "g");

export function commandInteractionToString(
	interaction: ChatInputCommandInteraction,
): `</${string}:${string}>` {
	const subcommandGroup = interaction.options.getSubcommandGroup(false);
	const subcommand = interaction.options.getSubcommand(false);

	if (subcommandGroup && subcommand)
		return chatInputApplicationCommandMention(
			interaction.commandName,
			subcommandGroup,
			subcommand,
			interaction.commandId,
		);

	if (subcommand)
		return chatInputApplicationCommandMention(
			interaction.commandName,
			subcommand,
			interaction.commandId,
		);

	return chatInputApplicationCommandMention(interaction.commandName, interaction.commandId);
}
export async function mentionChatCommand(
	fullCommand: string,
	guild?: Guild,
): Promise<`**/${string}**` | `</${string}:${string}>`> {
	const [commandName] = fullCommand.split(" ");
	const id = (
		(await guild?.commands.fetch())?.find(({ name }) => name === commandName) ??
		(await client.application.commands.fetch()).find(({ name }) => name === commandName)
	)?.id;
	return id ? chatInputApplicationCommandMention(fullCommand, id) : bold(`/${fullCommand}`);
}
export function columns<Item extends { toString(): string }>(
	array: Item[],
	title: string,
	count: 1 | 2 | 3,
	callback?: ((item: Item) => string) | undefined,
): APIEmbedField[];
export function columns<Item>(
	array: Item[],
	title: string,
	count: 1 | 2 | 3,
	callback: (item: Item) => string,
): APIEmbedField[];
export function columns(
	array: { toString(): string }[],
	title: string = constants.zws,
	count: 1 | 2 | 3 = 2,
	callback = (item: { toString(): string }) => item.toString(),
): APIEmbedField[] {
	const columnLength = Math.ceil(array.length / count);
	return Array.from({ length: count }, (_, index) => {
		const startIndex = index * columnLength;
		return {
			name: index === 0 ? title : constants.zws,
			value: array
				.slice(startIndex, startIndex + columnLength)
				.map(callback)
				.join("\n"),
			inline: true,
		};
	});
}
