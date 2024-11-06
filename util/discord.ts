import type {
	APIEmbed,
	Attachment,
	Awaitable,
	Collection,
	Guild,
	GuildMember,
	GuildTextBasedChannel,
	Message,
	Snowflake,
} from "discord.js";

import {
	channelMention,
	Colors,
	hyperlink,
	MessageFlags,
	messageLink,
	MessageType,
} from "discord.js";
import {
	client,
	escapeAllMarkdown,
	footerSeperator,
	getFilesFromMessage,
	isFileExpired,
	mentionChatCommand,
	stripMarkdown,
} from "strife.js";

import config from "../common/config.js";
import constants from "../common/constants.js";
import { truncateText } from "./text.js";

export async function extractMessageExtremities(
	message: Message,
	censor?: (text: string) => string,
	forceRefetch = true,
): Promise<{ embeds: APIEmbed[]; files: Attachment[] }> {
	const embeds = [];
	for (const { data } of message.flags.has(MessageFlags.SuppressEmbeds) ? [] : message.embeds) {
		if (
			forceRefetch &&
			((data.footer?.icon_url && isFileExpired(data.footer.icon_url)) ||
				(data.image && isFileExpired(data.image.url)) ||
				(data.thumbnail && isFileExpired(data.thumbnail.url)) ||
				(data.video?.url && isFileExpired(data.video.url)) ||
				(data.author?.icon_url && isFileExpired(data.author.icon_url)))
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
							automodInfo.keyword && automodInfo.rule_name && footerSeperator
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
		:	message.attachments.filter((file) => !isFileExpired(file.url))).values();

	return {
		embeds: [...stickers, ...embeds].slice(0, 10),
		files: [...files],
	};
}

const membersPromises: Record<Snowflake, Promise<Collection<Snowflake, GuildMember>> | undefined> =
	{};

export async function getAllMembers(guild: Guild): Promise<Collection<Snowflake, GuildMember>> {
	const members = await (membersPromises[guild.id] ??= config.guild.members.fetch());
	membersPromises[guild.id] = undefined;
	return members;
}

/** @deprecated */
export async function getAllMessages(channel: GuildTextBasedChannel): Promise<Message<true>[]> {
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
			:	`${constants.emojis.misc.loading} ${escapeAllMarkdown(
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
			}: **${escapeAllMarkdown(content)}**`;
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
				content && ` **${escapeAllMarkdown(content)}** times`
			}!`;
		}

		case MessageType.GuildBoostTier1: {
			return `${
				constants.emojis.message.boost
			} ${message.author.toString()} just boosted the server${
				content && ` **${escapeAllMarkdown(content)}** times`
			}! ${escapeAllMarkdown(message.guild?.name ?? "")} has achieved **Level 1**!`;
		}

		case MessageType.GuildBoostTier2: {
			return `${
				constants.emojis.message.boost
			} ${message.author.toString()} just boosted the server${
				content && ` **${escapeAllMarkdown(content)}** times`
			}! ${escapeAllMarkdown(message.guild?.name ?? "")} has achieved **Level 2**!`;
		}

		case MessageType.GuildBoostTier3: {
			return `${
				constants.emojis.message.boost
			} ${message.author.toString()} just boosted the server${
				content && ` **${escapeAllMarkdown(content)}** times`
			}! ${escapeAllMarkdown(message.guild?.name ?? "")} has achieved **Level 3**!`;
		}

		case MessageType.ChannelFollowAdd: {
			return `${
				constants.emojis.message.add
			} ${message.author.toString()} has added **${escapeAllMarkdown(
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
			} ${message.author.toString()} started a thread: [${escapeAllMarkdown(
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
			return `*${message.interaction.user.toString()} used **${escapeAllMarkdown(
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
					escapeAllMarkdown(message.guild?.name ?? ""),
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
		message.type === MessageType.GuildInviteReminder ? (lines[1] ?? "") : lines.join("\n");
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

export const BotInvitesPattern = new RegExp(
	/discord(?:app)?\.com\/(?:(?:api\/)?oauth2\/authorize\/?\?\S*client_id=(?!CLIENT_ID)\d{17,20}\S*(?:\s|$)|application-directory\/(?!CLIENT_ID)\d{17,20})/.source.replaceAll(
		"CLIENT_ID",
		constants.env === "testing" ? "0" : client.user.id,
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
