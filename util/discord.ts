import {
	type ActionRow,
	ButtonStyle,
	Colors,
	ComponentType,
	type Message,
	MessageType,
	ChannelType,
	type Attachment,
	type User,
	type APIActionRowComponent,
	type APIEmbed,
	type APIMessageActionRowComponent,
	type Awaitable,
	type BaseMessageOptions,
	type EmojiIdentifierResolvable,
	type GuildTextBasedChannel,
	type InteractionReplyOptions,
	type MessageActionRowComponent,
	type MessageEditOptions,
	type Snowflake,
	type TextBasedChannel,
	type MessageActionRowComponentData,
	type ActionRowData,
	GuildMember,
	FormattingPatterns,
	Invite,
	MessageMentions,
	type AnyThreadChannel,
	type MessageReaction,
	chatInputApplicationCommandMention,
	DMChannel,
	type PartialDMChannel,
	bold,
	ChatInputCommandInteraction,
} from "discord.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import { escapeMessage, stripMarkdown } from "./markdown.js";
import { generateHash, truncateText } from "./text.js";

/**
 * Extract extremities (embeds, stickers, and attachments) from a message.
 *
 * @param message - The message to extract extremeties from.
 * @param censor - Function to censor bad words. Omit to not censor.
 */
export function extractMessageExtremities(
	message: Message,
	censor?: (text: string) => false | { censored: string; strikes: number; words: string[][] },
): { embeds: APIEmbed[]; files: Attachment[] } {
	const embeds = [
		...message.stickers
			.filter((sticker) => !censor?.(sticker.name))
			.map(
				(sticker): APIEmbed => ({
					color: Colors.Blurple,
					image: { url: sticker.url },
					footer: { text: sticker.name },
				}),
			),
		...message.embeds
			.filter((embed) => !embed.video)
			.map(({ data }): APIEmbed => {
				const newEmbed = { ...data };

				if (message.type === MessageType.AutoModerationAction) {
					newEmbed.author = {
						icon_url: (message.member ?? message.author).displayAvatarURL(),
						name: (message.member ?? message.author).displayName,
					};
					newEmbed.color = message.member?.displayColor;

					newEmbed.footer = {
						text: `Keyword: ${
							newEmbed.fields?.find(({ name }) => name === "keyword")?.value
						}${constants.footerSeperator}Rule: ${
							newEmbed.fields?.find(({ name }) => name === "rule_name")?.value
						}`,
					};

					newEmbed.fields = [];
				}

				if (!censor) return newEmbed;

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

					if (censored) newEmbed.footer.text = censored.censored;
				}

				if (newEmbed.author) {
					const censoredName = censor(newEmbed.author.name);
					const censoredUrl = newEmbed.author.url && censor(newEmbed.author.url);

					if (censoredName) newEmbed.author.name = censoredName.censored;

					if (censoredUrl) newEmbed.author.url = "";
				}

				newEmbed.fields = (newEmbed.fields ?? []).map((field) => {
					const censoredName = censor(field.name);
					const censoredValue = censor(field.value);
					return {
						inline: field.inline,
						name: censoredName ? censoredName.censored : field.name,
						value: censoredValue ? censoredValue.censored : field.value,
					};
				});

				return newEmbed;
			}),
	];

	while (embeds.length > 10) embeds.pop();

	return { embeds, files: message.attachments.toJSON() };
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
 * @deprecated Too laggy.
 *
 * @param channel - The channel to fetch messages from.
 *
 * @returns The messages.
 */
export async function getAllMessages(channel: GuildTextBasedChannel): Promise<Message<true>[]>;
export async function getAllMessages(
	channel: DMChannel | PartialDMChannel,
): Promise<Message<false>[]>;
export async function getAllMessages(channel: TextBasedChannel): Promise<Message[]> {
	const messages = [];

	let lastId: Snowflake | undefined;

	do {
		// eslint-disable-next-line no-await-in-loop -- We can’t use `Promise.all` here
		const fetchedMessages = await channel.messages.fetch({ before: lastId, limit: 100 });

		messages.push(...fetchedMessages.toJSON());
		lastId = fetchedMessages.lastKey();
	} while (lastId);

	return messages;
}

/**
 * A property that returns the content that is rendered regardless of the {@link Message.type}. In some cases, this just returns the regular
 * {@link Message.content}. Otherwise this returns an English message denoting the contents of the system message.
 *
 * @author Based Off of [Rapptz/discord.py's
 *   `system_content`](https://github.com/Rapptz/discord.py/blob/14faa9b/discord/message.py#L2001-L2141)
 * @param message - Message to convert.
 * @param replies - Whether to quote replies.
 *
 * @returns Text representation of the message.
 */
export function messageToText(message: Message, replies: false): string;
export async function messageToText(message: Message, replies?: true): Promise<string>;
export function messageToText(message: Message, replies = true): Awaitable<string> {
	const actualContent = message.flags.has("Loading")
		? (Date.now() - Number(message.createdAt)) / 1000 / 60 > 15
			? `${constants.emojis.discord.error} The application did not respond`
			: `${constants.emojis.discord.typing} ${escapeMessage(
					message.author.displayName,
			  )} is thinking...`
		: message.content;

	switch (message.type) {
		case MessageType.Default: {
			return message.content;
		}

		case MessageType.RecipientAdd: {
			return `${constants.emojis.discord.add} ${message.author.toString()} added ${
				message.mentions.users.first()?.toString() ?? ""
			} to the ${message.guild ? "thread" : "group"}.`;
		}

		case MessageType.RecipientRemove: {
			return `${constants.emojis.discord.remove} ${message.author.toString()} removed ${
				message.mentions.users.first()?.toString() ?? ""
			} from the ${message.guild ? "thread" : "group"}.`;
		}

		case MessageType.ChannelNameChange: {
			return `${constants.emojis.discord.edit} ${message.author.toString()} changed the ${
				message.channel.isThread() &&
				message.channel.parent?.type === ChannelType.GuildForum
					? "post title"
					: "channel name"
			}: **${escapeMessage(message.content)}**`;
		}

		case MessageType.ChannelIconChange: {
			return `${
				constants.emojis.discord.edit
			} ${message.author.toString()} changed the group icon.`;
		}

		case MessageType.ChannelPinnedMessage: {
			if (!replies)
				return `${
					constants.emojis.discord.pin
				} ${message.author.toString()} pinned **a message** to this channel. See all **pinned messages**.`;

			return `${
				constants.emojis.discord.pin
			} ${message.author.toString()} pinned [a message](${message.url.replace(
				message.id,
				message.reference?.messageId || "",
			)}) to this channel. See all [pinned messages](${message.channel.url}).`;
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
				`Glad you're here, ${message.author.toString()}.`,
				`Good to see you, ${message.author.toString()}.`,
				`Yay you made it, ${message.author.toString()}!`,
			];

			const createdAtMs = Number(message.createdAt);
			return `${constants.emojis.discord.add} ${formats[createdAtMs % formats.length]}`;
		}

		case MessageType.GuildBoost: {
			return `${
				constants.emojis.discord.boost
			} ${message.author.toString()} just boosted the server${
				message.content ? ` **${message.content}** times` : ""
			}!`;
		}

		case MessageType.GuildBoostTier1: {
			return `${
				constants.emojis.discord.boost
			} ${message.author.toString()} just boosted the server${
				message.content ? ` **${message.content}** times` : ""
			}! **${escapeMessage(message.guild?.name ?? "")}** has achieved **Level 1**!`;
		}

		case MessageType.GuildBoostTier2: {
			return `${
				constants.emojis.discord.boost
			} ${message.author.toString()} just boosted the server${
				message.content ? ` **${message.content}** times` : ""
			}! **${escapeMessage(message.guild?.name ?? "")}** has achieved **Level 2**!`;
		}

		case MessageType.GuildBoostTier3: {
			return `${
				constants.emojis.discord.boost
			} ${message.author.toString()} just boosted the server${
				message.content ? ` **${message.content}** times` : ""
			}! **${escapeMessage(message.guild?.name ?? "")}** has achieved **Level 3**!`;
		}

		case MessageType.ChannelFollowAdd: {
			return `${
				constants.emojis.discord.add
			} ${message.author.toString()} has added **${escapeMessage(
				message.content,
			)}** to this channel. Its most important updates will show up here.`;
		}

		// case MessageType.GuildStream: {
		// 	// the author will be a Member
		// 	return `${message.author.toString()} is live! Now streaming ${
		// 		message.groupActivityApplication?.name
		// 	}`;
		// }

		case MessageType.GuildDiscoveryDisqualified: {
			return `${constants.emojis.discord.no} This server has been removed from Server Discovery because it no longer passes all the requirements. Check Server Settings for more details.`;
		}

		case MessageType.GuildDiscoveryRequalified: {
			return `${constants.emojis.discord.yes} This server is eligible for Server Discovery again and has been automatically relisted!`;
		}

		case MessageType.GuildDiscoveryGracePeriodInitialWarning: {
			return `${constants.emojis.discord.warning} This server has failed Discovery activity requirements for 1 week. If this server fails for 4 weeks in a row, it will be automatically removed from Discovery.`;
		}

		case MessageType.GuildDiscoveryGracePeriodFinalWarning: {
			return `${constants.emojis.discord.warning} This server has failed Discovery activity requirements for 3 weeks in a row. If this server fails for 1 more week, it will be removed from Discovery.`;
		}

		case MessageType.ThreadCreated: {
			return `${
				constants.emojis.discord.thread
			} ${message.author.toString()} started a thread: **${escapeMessage(
				message.content,
			)}** See all **threads**.`;
		}

		case MessageType.Reply: {
			if (!replies) return message.content;
			return message
				.fetchReference()
				.catch(() => {})
				.then(async (reply) => {
					if (!reply)
						return `*${constants.emojis.discord.reply} Original message was deleted*\n\n${message.content}`;

					const cleanContent = messageToText(reply, false);
					return `*[Replying to](${reply.url}) ${reply.author.toString()}${
						cleanContent
							? `:*\n> ${truncateText(stripMarkdown(cleanContent), 300)}`
							: "*"
					}\n\n${message.content}`;
				});
		}

		case MessageType.ThreadStarterMessage: {
			if (!replies) return actualContent;
			return message
				.fetchReference()
				.catch(() => {})
				.then((reference) =>
					// The resolved message for the reference will be a Message
					reference
						? messageToText(reference, replies) || actualContent
						: `${constants.emojis.discord.thread} Sorry, we couldn't load the first message in this thread`,
				);
		}

		case MessageType.GuildInviteReminder: {
			return "Wondering who to invite?\nStart by inviting anyone who can help you build the server!";
		}

		case MessageType.RoleSubscriptionPurchase: {
			// TODO: figure out how the message looks like for is_renewal: true
			const totalMonths = message.roleSubscriptionData?.totalMonthsSubscribed;
			const months = `${totalMonths} month${totalMonths === 1 ? "" : "s"}`;
			return `${message.author.toString()} joined ${
				message.roleSubscriptionData?.tierName
			} and has been a subscriber of **${escapeMessage(
				message.guild?.name ?? "",
			)}** for ${months}!`;
		}

		case MessageType.StageStart: {
			return `${constants.emojis.discord.stageLive} ${message.author.toString()} started **${
				message.content
			}**`;
		}

		case MessageType.StageEnd: {
			return `${constants.emojis.discord.stage} ${message.author.toString()} ended **${
				message.content
			}**`;
		}

		case MessageType.StageSpeaker: {
			return `${
				constants.emojis.discord.speaker
			} ${message.author.toString()} is now a speaker.`;
		}

		case MessageType.StageRaiseHand: {
			return `${
				constants.emojis.discord.raisedHand
			} ${message.author.toString()} requested to speak.`;
		}

		case MessageType.StageTopic: {
			return `${
				constants.emojis.discord.stage
			} ${message.author.toString()} changed Stage topic: **${message.content}**`;
		}

		case MessageType.ContextMenuCommand: {
			if (!replies) return actualContent;
			return `*${message.interaction?.user.toString() ?? ""} used **${escapeMessage(
				message.interaction?.commandName ?? "",
			)}**:*\n${actualContent}`;
		}

		case MessageType.ChatInputCommand: {
			if (!replies) return actualContent;

			const commandName = message.interaction?.commandName.split(" ")[0];
			return config.guild.commands
				.fetch()
				.then((commands) => commands.find(({ name }) => name === commandName))
				.then(
					(command) =>
						`*${message.interaction?.user.toString() ?? ""} used ${
							command
								? chatInputApplicationCommandMention(
										message.interaction?.commandName ?? "",
										command.id ?? "",
								  )
								: bold(`/${message.interaction?.commandName ?? ""}`)
						}:*\n${actualContent}`,
				);
		}

		case MessageType.Call: {
			return `${constants.emojis.discord.call} ${message.author.toString()} started a call.`;
		}

		case MessageType.AutoModerationAction: {
			return `**AutoMod** has ${
				message.embeds[0]?.fields.find(({ name }) => name === "flagged_message_id")
					? "flagged"
					: "blocked"
			} a message in <#${
				message.embeds[0]?.fields.find(({ name }) => name === "channel_id")?.value
			}>`;
		}

		default: {
			// Fallback for unknown message types
			throw new TypeError(`Unknown message type: ${message.type}`);
		}
	}
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
): Promise<MessageReaction[] | void> {
	const messageReactions = [];
	// eslint-disable-next-line no-await-in-loop -- This is the point of this function.
	for (const reaction of reactions) {
		try {
			const messageReaction = await message.react(reaction);
			messageReactions.push(messageReaction);
		} catch {
			return;
		}
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
				component.type === ComponentType.Button
					? component.style !== ButtonStyle.Link
					: true,
		})),

		type: ComponentType.ActionRow,
	}));
}

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
	reply: (options: InteractionReplyOptions & { fetchReply: true }) => Promise<Message>,
	{
		title,
		format,
		singular,
		plural = `${singular}s`,
		failMessage = `No ${plural} found!`,

		user,
		rawOffset,
		totalCount,

		generateComponents,
		customComponentLocation = "below",
	}: {
		title: string;
		format?: GuildMember | User;
		singular: string;
		plural?: string;
		failMessage?: string;

		user: User | false;
		rawOffset?: number;
		totalCount?: number;

		generateComponents?: (items: Item[]) => MessageActionRowComponentData[] | undefined;
		customComponentLocation?: "above" | "below";
	},
): Promise<void> {
	const ITEMS_PER_PAGE = 15;

	const previousId = generateHash("previous");
	const nextId = generateHash("next");
	const numberOfPages = Math.ceil(array.length / ITEMS_PER_PAGE);

	let offset = Math.floor((rawOffset ?? 0) / ITEMS_PER_PAGE) * ITEMS_PER_PAGE;

	/**
	 * Generate an embed that has the next page.
	 *
	 * @returns The next page.
	 */
	async function generateMessage(): Promise<BaseMessageOptions & { fetchReply: true }> {
		const filtered = array.filter(
			(_, index) => index >= offset && index < offset + ITEMS_PER_PAGE,
		);

		if (!filtered.length) {
			return { content: `${constants.emojis.statuses.no} ${failMessage}`, fetchReply: true };
		}

		const content = (
			await Promise.all(
				filtered.map(async (current, index, all) => {
					const line = `${totalCount ? `${index + offset + 1}) ` : ""}${await toString(
						current,
						index,
						all,
					)}`;
					return rawOffset === index + offset ? `__${line}__` : line;
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
									disabled: offset + ITEMS_PER_PAGE >= array.length,
									customId: nextId,
								},
							],
						},
				  ]
				: [];

		if (generateComponents) {
			const extraComponents = generateComponents(filtered);
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
						text: `Page ${offset / ITEMS_PER_PAGE + 1}/${numberOfPages}${
							constants.footerSeperator
						}${count.toLocaleString("en-us")} ${count === 1 ? singular : plural}`,
					},

					author: format
						? {
								// eslint-disable-next-line id-match -- We didn’t name this.
								icon_url: format.displayAvatarURL(),

								name: format.displayName,
						  }
						: undefined,

					color: format
						? format instanceof GuildMember
							? format.displayColor
							: undefined
						: constants.themeColor,
				},
			],
			fetchReply: true,
		};
	}

	let message = await reply(await generateMessage());
	if (numberOfPages === 1 || !user) return;

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) =>
			[previousId, nextId].includes(buttonInteraction.customId) &&
			buttonInteraction.user.id === user.id,

		time: constants.collectorTime,
	});

	collector
		.on("collect", async (buttonInteraction) => {
			if (buttonInteraction.customId === nextId) offset += ITEMS_PER_PAGE;
			else offset -= ITEMS_PER_PAGE;

			await buttonInteraction.deferUpdate();
			message.edit(await generateMessage());
			collector.resetTimer();
		})
		.on("end", async () => {
			const [pagination, ...rest] = message.components;
			if (pagination)
				await message.edit({ components: [...disableComponents([pagination]), ...rest] });
		});
}

/**
 * Get a non-thread text channel from any other text channel.
 *
 * @param channel - The channel to convert.
 *
 * @returns The non-thread text channel.
 */
export function getBaseChannel<Channel extends TextBasedChannel | null | undefined>(
	channel: Channel,
): Channel extends null | undefined
	? undefined
	: Channel extends AnyThreadChannel
	? Exclude<GuildTextBasedChannel, AnyThreadChannel> | undefined
	: Channel {
	// @ts-expect-error TS2322 -- This is the right type.
	return channel ? (channel.isThread() ? channel.parent ?? undefined : channel) : undefined;
}

/** A global regular expression variant of {@link MessageMentions.UsersPattern}. */
export const GlobalUsersPattern = new RegExp(MessageMentions.UsersPattern, "g");

/** A global regular expression variant of {@link Invite.InvitesPattern}. */
export const GlobalInvitesPattern = new RegExp(Invite.InvitesPattern, "g");

/** A global regular expression variant of {@link FormattingPatterns.AnimatedEmoji}. */
export const GlobalAnimatedEmoji = new RegExp(FormattingPatterns.AnimatedEmoji, "g");

export const BotInvitesPattern = /discord(?:app)?\.com\/(?:api\/)?oauth2\/authorize/i;

/** A global regular expression variant of {@link BotInvitesPattern}. */
export const GlobalBotInvitesPattern = new RegExp(BotInvitesPattern, "g");

export function commandInteractionToString(interaction: ChatInputCommandInteraction) {
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
