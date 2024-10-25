import {
	ButtonStyle,
	Colors,
	ComponentType,
	FormattingPatterns,
	GuildMember,
	MessageFlags,
	MessageMentions,
	MessageType,
	bold,
	channelMention,
	chatInputApplicationCommandMention,
	hyperlink,
	messageLink,
	type APIActionRowComponent,
	type APIEmbed,
	type APIEmbedField,
	type APIMessageActionRowComponent,
	type ActionRow,
	type ActionRowData,
	type AnyThreadChannel,
	type Attachment,
	type Awaitable,
	type Channel,
	type ChatInputCommandInteraction,
	type Collection,
	type EmojiIdentifierResolvable,
	type Guild,
	type GuildTextBasedChannel,
	type InteractionReplyOptions,
	type Message,
	type MessageActionRowComponent,
	type MessageActionRowComponentData,
	type MessageEditOptions,
	type MessageReaction,
	type Snowflake,
	type ThreadChannel,
	type User,
} from "discord.js";
import { client } from "strife.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import { escapeMessage, stripMarkdown } from "./markdown.js";
import { truncateText } from "./text.js";

export function unsignFiles(content: string): string {
	return content.replaceAll(
		/https:\/\/(?:cdn|media)\.discordapp\.(?:net|com)\/attachments\/(?:[\w!#$&'()*+,./:;=?@~-]|%\d\d)+/gis,
		(match) => {
			const url = new URL(match);
			return url.origin + url.pathname;
		},
	);
}

export function isFileExpired(file: { url: string }): boolean {
	const expirey = new URL(file.url).searchParams.get("ex");
	return !!expirey && Number.parseInt(expirey, 16) * 1000 < Date.now();
}

export async function getFilesFromMessage(
	message: Message,
): Promise<Collection<string, Attachment>> {
	const expired = message.attachments.some(isFileExpired);
	if (!expired) return message.attachments;

	const fetched = await message.fetch(true);
	return fetched.attachments;
}

export async function extractMessageExtremities(
	message: Message,
	censor?: (text: string) => string,
	forceRefetch = true,
): Promise<{ embeds: APIEmbed[]; files: Attachment[] }> {
	const embeds = [];
	for (const { data } of message.flags.has(MessageFlags.SuppressEmbeds) ? [] : message.embeds) {
		if (
			forceRefetch &&
			((data.footer?.icon_url && isFileExpired({ url: data.footer.icon_url })) ||
				(data.image && isFileExpired(data.image)) ||
				(data.thumbnail && isFileExpired(data.thumbnail)) ||
				(data.video?.url && isFileExpired({ url: data.video.url })) ||
				(data.author?.icon_url && isFileExpired({ url: data.author.icon_url })))
		)
			return await extractMessageExtremities(await message.fetch(true), censor, false);

		const automodInfo =
			message.type === MessageType.AutoModerationAction &&
			(data.fields ?? []).reduce(
				(accumulator, field) => ({ ...accumulator, [field.name]: field.value }),
				{
					flagged_message_id: message.id,
					channel_id: message.channel.id,
					keyword: "",
					rule_name: "",
				},
			);

		const newEmbed =
			automodInfo ?
				{
					...data,
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
						text: `${automodInfo.keyword && `Keyword: ${automodInfo.keyword}`}${
							automodInfo.keyword &&
							automodInfo.rule_name &&
							constants.footerSeperator
						}${automodInfo.rule_name && `Rule: ${automodInfo.rule_name}`}`,
					},
					fields: [],
				}
			:	{ ...data };

		if (!censor) {
			embeds.push(newEmbed);
			continue;
		}

		newEmbed.title = censor(newEmbed.title ?? "");
		newEmbed.description = censor(newEmbed.description ?? "");
		if (newEmbed.author) newEmbed.author.name = censor(newEmbed.author.name);
		if (newEmbed.footer) newEmbed.footer.text = censor(newEmbed.footer.text);

		if (newEmbed.url && newEmbed.url !== censor(newEmbed.url)) newEmbed.url = undefined;
		if (newEmbed.author?.url && newEmbed.author.url !== censor(newEmbed.author.url))
			newEmbed.author.url = undefined;
		if (newEmbed.thumbnail && newEmbed.thumbnail.url !== censor(newEmbed.thumbnail.url))
			newEmbed.thumbnail = undefined;
		if (newEmbed.video?.url && newEmbed.video.url !== censor(newEmbed.video.url))
			newEmbed.video = undefined;
		if (newEmbed.image && newEmbed.image.url !== censor(newEmbed.image.url))
			newEmbed.image = undefined;

		newEmbed.fields = (newEmbed.fields ?? []).map((field) => ({
			inline: field.inline,
			name: censor(field.name),
			value: censor(field.value),
		}));

		embeds.push(newEmbed);
	}

	const stickers = message.stickers
		.filter((sticker) => !censor?.(sticker.name))
		.map(
			(sticker): APIEmbed => ({
				color: Colors.Blurple,
				image: { url: sticker.url },
				footer: { text: sticker.name },
			}),
		);

	const files = (
		forceRefetch ?
			await getFilesFromMessage(message)
		:	message.attachments.filter((file) => !isFileExpired(file))).values();

	return {
		embeds: [...stickers, ...embeds].slice(0, 10),
		files: [...files],
	};
}

export async function getMessageJSON(message: Message): Promise<{
	components: APIActionRowComponent<APIMessageActionRowComponent>[];
	content: string;
	embeds: APIEmbed[];
	files: string[];
}> {
	return {
		components: message.components.map((component) => component.toJSON()),
		content: message.content,
		embeds: message.embeds.map((embed) => embed.toJSON()),
		files: (await getFilesFromMessage(message)).map((attachment) => attachment.url),
	} satisfies MessageEditOptions;
}

const membersPromises: Record<Snowflake, Promise<Collection<Snowflake, GuildMember>> | undefined> =
	{};

export async function getAllMembers(guild: Guild): Promise<Collection<Snowflake, GuildMember>> {
	const members = await (membersPromises[guild.id] ??= config.guild.members.fetch());
	membersPromises[guild.id] = undefined;
	return members;
}

/** @deprecated */
export async function getAllMessages(
	channel: GuildTextBasedChannel | ThreadChannel,
): Promise<Message<true>[]> {
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
 * A property that returns the content that is rendered regardless of the {@link Message.type}. In some cases, this just
 * returns the regular {@link Message.content}. Otherwise this returns an English message denoting the contents of the
 * system message.
 *
 * @author Based Off of [Rapptz/discord.py’s
 *   `system_content`](https://github.com/Rapptz/discord.py/blob/08ef42f/discord/message.py#L2080-L2234)
 * @param message - Message to convert.
 * @param replies - Whether to quote replies.
 * @returns Text representation of the message.
 */
export function messageToText(message: Message, replies: false): string;
export async function messageToText(message: Message, replies?: true): Promise<string>;
export function messageToText(message: Message, replies = true): Awaitable<string> {
	const content =
		message.flags.has("Loading") ?
			(Date.now() - message.createdTimestamp) / 1000 / 60 > 15 ?
				`${constants.emojis.message.error} The application did not respond`
			:	`${constants.emojis.misc.loading} ${escapeMessage(
					message.author.displayName,
					// eslint-disable-next-line unicorn/string-content
				)} is thinking...`
		:	message.content;

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
				message.channel.isThread() && message.channel.parent?.isThreadOnly() ?
					"post title"
				:	"channel name"
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
			const replyLink = `<${messageLink(
				message.reference?.guildId ?? message.guild?.id ?? "@me",
				message.reference?.channelId ?? message.channel.id,
				message.reference?.messageId ?? message.id,
			)}>`;

			return message
				.fetchReference()
				.catch(() => void 0)
				.then((reply) => {
					if (!reply) {
						return `*${constants.emojis.message.reply}[ Original message was deleted](${replyLink})*\n\n${content}`;
					}
					const cleanContent = messageToText(reply, false).replaceAll(/\s+/g, " ");
					const replyContent =
						cleanContent && `\n> ${truncateText(stripMarkdown(cleanContent), 300)}`;
					return `*[Replying to ](${replyLink})${reply.author.toString()}${replyContent && `:`}*${replyContent}\n\n${content}`;
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
				message.embeds[0]?.fields.find(({ name }) => name === "flagged_message_id") ?
					"flagged"
				:	"blocked"
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
		message.type === MessageType.AutoModerationAction ? content
		: message.type === MessageType.GuildInviteReminder ? lines[0] + " 🤖"
		: (message.member ?? message.author).displayName +
			(message.author.bot || message.webhookId ? " 🤖" : "");
	return {
		color:
			message.type === MessageType.AutoModerationAction ? 0x99_a1_f2
			: message.type === MessageType.GuildInviteReminder ? undefined
			: message.member?.displayColor,
		description: message.type === MessageType.AutoModerationAction ? "" : censor(content),

		author: {
			icon_url:
				message.type === MessageType.AutoModerationAction ?
					"https://discord.com/assets/e7af5fc8fa27c595d963c1b366dc91fa.gif"
				: message.type === MessageType.GuildInviteReminder ?
					"https://discord.com/assets/e4c6bb8de56c299978ec36136e53591a.svg"
				:	(message.member ?? message.author).displayAvatarURL(),

			name: censor(author),
		},

		timestamp:
			message.type === MessageType.GuildInviteReminder ?
				undefined
			:	message.createdAt.toISOString(),

		footer: message.editedAt ? { text: "Edited" } : undefined,
	};
}

/**
 * React with multiple emojis to a message, one at a time & in order.
 *
 * @param message - The message to react to.
 * @param reactions - The reactions to add.
 * @returns The added reactions.
 */
export async function reactAll(
	message: Message,
	reactions: readonly EmojiIdentifierResolvable[],
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
	pageLength?: number;
	columns?: 1 | 2 | 3;
	timeout?: number;

	generateComponents?(
		this: void,
		items: Item[],
	): Awaitable<MessageActionRowComponentData[] | undefined>;
	customComponentLocation?: "above" | "below";
};
export async function paginate<Item>(
	array: Item[],
	stringify: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	editReply: (options: InteractionReplyOptions) => Awaitable<void> | Promise<Message>,
	options: PaginateOptions<Item>,
): Promise<InteractionReplyOptions | undefined>;
export async function paginate<Item>(
	array: Item[],
	stringify: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	editReply: (options: InteractionReplyOptions) => Awaitable<void>,
	options: PaginateOptions<Item, false>,
): Promise<InteractionReplyOptions>;
export async function paginate<Item>(
	array: Item[],
	stringify: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	editReply: (options: InteractionReplyOptions) => Promise<Message>,
	options: PaginateOptions<Item, User>,
): Promise<undefined>;
export async function paginate<Item>(
	array: Item[],
	stringify: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	editReply: (options: InteractionReplyOptions) => Awaitable<void> | Promise<Message>,
	{
		title,
		format,
		singular,
		plural = `${singular}s`,
		failMessage = `No ${plural} found! Try changing any filters you may have used.`,

		user,
		rawOffset,
		highlightOffset = true,
		totalCount,
		pageLength = 20,
		columns = 1,
		timeout = constants.collectorTime,

		generateComponents,
		customComponentLocation = "above",
	}: PaginateOptions<Item>,
): Promise<InteractionReplyOptions | undefined> {
	if (!array.length) {
		const content = `${constants.emojis.statuses.no} ${failMessage}`;
		await editReply({ content });
		return user ? undefined : { content };
	}

	const pageCount = Math.ceil(array.length / pageLength);
	const originalOffset = Math.floor((rawOffset ?? 0) / pageLength) * pageLength;
	let currentOffset = originalOffset;

	const presence =
		user && (format instanceof GuildMember ? format : config).guild.presences.resolve(user.id);
	const isMobile = !presence || presence.clientStatus?.mobile;
	/**
	 * Generate an embed that has the next page.
	 *
	 * @returns The next page.
	 */
	async function generateMessage(
		last = false,
	): Promise<InteractionReplyOptions & MessageEditOptions> {
		const condensed = last || isMobile;
		const length = condensed && columns !== 1 ? pageLength / 2 : pageLength;
		const pages = condensed ? Math.ceil(array.length / length) : pageCount;
		const offset =
			Math.floor(
				(currentOffset === originalOffset ? rawOffset ?? 0 : currentOffset) / length,
			) * length;
		const filtered = array.filter((_, index) => index >= offset && index < offset + length);
		const itemCount = totalCount ?? array.length;

		async function formatLine(current: Item, rawIndex: number): Promise<string> {
			const index = rawIndex + offset;
			const stringified = await stringify(current, index, filtered);
			const line = `${totalCount ? "-" : `${index + 1}.`} ${
				condensed ? stringified.replaceAll(/\n\s+/g, " - ") : stringified
			}`;

			return highlightOffset && rawOffset === rawIndex + offset ? `__${line}__` : line;
		}

		const components: ActionRowData<MessageActionRowComponentData>[] =
			pages > 1 && user ?
				[
					{
						type: ComponentType.ActionRow,

						components: [
							{
								type: ComponentType.Button,
								label: "<< Previous",
								style: ButtonStyle.Primary,
								disabled: last || offset < 1,
								customId: "previous",
							},
							{
								type: ComponentType.Button,
								label: "Next >>",
								style: ButtonStyle.Primary,
								disabled: last || offset + length >= array.length,
								customId: "next",
							},
						],
					},
				]
			:	[];

		if (generateComponents) {
			const extraComponents = await generateComponents(filtered);
			if (extraComponents?.length)
				components[customComponentLocation === "above" ? "unshift" : "push"]({
					type: ComponentType.ActionRow,
					components: extraComponents,
				});
		}

		return {
			components,
			embeds: [
				{
					title,
					description:
						condensed || columns === 1 ?
							(await Promise.all(filtered.map(formatLine))).join("\n")
						:	"",
					fields:
						condensed || columns === 1 ?
							[]
						:	await columnize(filtered, formatLine, constants.zws, columns),

					footer: {
						text: `Page ${offset / length + 1}/${pages}${
							constants.footerSeperator
						}${itemCount.toLocaleString()} ${itemCount === 1 ? singular : plural}`,
					},

					author:
						format ?
							{ icon_url: format.displayAvatarURL(), name: format.displayName }
						:	undefined,

					color:
						format instanceof GuildMember ? format.displayColor
						: format ? undefined
						: constants.themeColor,
				},
			],
		};
	}

	const firstReplyOptions = await generateMessage();
	const message = await editReply(firstReplyOptions);
	if (!user || !message) return firstReplyOptions;
	if (pageCount === 1) return;

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) =>
			buttonInteraction.message.id === message.id && buttonInteraction.user.id === user.id,

		idle: timeout === 0 ? undefined : timeout,
		time: message.flags.has("Ephemeral") ? (14 * 60 + 50) * 1000 : undefined,
	});

	collector
		.on("collect", async (buttonInteraction) => {
			const length = isMobile && columns !== 1 ? pageLength / 2 : pageLength;
			if (buttonInteraction.customId === "next") currentOffset += length;
			else if (buttonInteraction.customId === "previous") currentOffset -= length;
			else return;

			await buttonInteraction.deferUpdate();
			await editReply(await generateMessage());
		})
		.on("end", async () => {
			await editReply(await generateMessage(true));
		});
}

export function getBaseChannel<TChannel extends Channel | null | undefined>(
	channel: TChannel,
): TChannel extends null ? undefined
: TChannel extends AnyThreadChannel ? NonNullable<TChannel["parent"]> | undefined
: TChannel {
	// @ts-expect-error TS2322
	return (channel && (channel.isThread() ? channel.parent : channel)) || undefined;
}

/** A global regular expression variant of {@link MessageMentions.UsersPattern}. */
export const GlobalUsersPattern = new RegExp(
	MessageMentions.UsersPattern,
	`g${MessageMentions.UsersPattern.flags}`,
);

/** An enhanced variant of {@link Invite.InvitesPattern}. */
export const InvitesPattern =
	/discord(?:(?:(?:app)?\.com|:\/(?:\/-?)?)\/invite|\.gg(?:\/invite)?)\/(?<code>[\w-]{2,255})/gi;

/** A global regular expression variant of {@link FormattingPatterns.AnimatedEmoji}. */
export const GlobalAnimatedEmoji = new RegExp(
	FormattingPatterns.AnimatedEmoji,
	`g${FormattingPatterns.AnimatedEmoji.flags}`,
);

export const BotInvitesPattern = new RegExp(
	/discord(?:app)?\.com\/(?:(?:api\/)?oauth2\/authorize\/?\?\S*client_id=(?!CLIENT_ID)\d{17,20}\S*(?:\s|$)|application-directory\/(?!CLIENT_ID)\d{17,20})/.source.replaceAll(
		"CLIENT_ID",
		constants.isTesting ? "0" : client.user.id,
	),
	"i",
);

/**
 * A combination of {@link FormattingPatterns.UserWithOptionalNickname}, {@link FormattingPatterns.Channel},
 * {@link FormattingPatterns.Role}, {@link FormattingPatterns.SlashCommand}, {@link FormattingPatterns.Emoji}, and
 * {@link FormattingPatterns.Timestamp}.
 */
export const GlobalMentionsPattern =
	/<:(?:\/[- _\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,98}:|a?:\w{2,32}:|@[!&]?|#)\d{17,20}>|<t:-?\d{1,13}(?::[DFRTdft])?>/gu;

/** A global regular expression variant of {@link BotInvitesPattern}. */
export const GlobalBotInvitesPattern = new RegExp(BotInvitesPattern, `g${BotInvitesPattern.flags}`);

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
export async function columnize<Item extends { toString(): Awaitable<string> }>(
	array: Item[],
	stringify?: (item: Item, index: number, array: Item[]) => Awaitable<string>,
	title?: string,
	count?: 1 | 2 | 3,
): Promise<APIEmbedField[]>;
export async function columnize<Item>(
	array: Item[],
	stringify: (item: Item, index: number, array: Item[]) => Awaitable<string>,
	title: string,
	count?: 1 | 2 | 3,
): Promise<APIEmbedField[]>;
export async function columnize(
	array: { toString(): string }[],
	stringify = (
		item: { toString(): Awaitable<string> },
		_: number,
		__: { toString(): Awaitable<string> }[],
	) => item.toString(),
	title: string = constants.zws,
	count: 1 | 2 | 3 = 2,
): Promise<APIEmbedField[]> {
	const size = Math.ceil(array.length / count);
	return await Promise.all(
		Array.from({ length: count }, async (_, index) => {
			const start = index * size;
			return {
				name: index === 0 ? title : constants.zws,
				value: (
					await Promise.all(
						array
							.slice(start, start + size)
							.map((item, subindex, column) =>
								stringify(item, start + subindex, column),
							),
					)
				).join("\n"),
				inline: true,
			};
		}),
	);
}
