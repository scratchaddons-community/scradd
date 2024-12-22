import type {
	APIEmbed,
	Attachment,
	Awaitable,
	Collection,
	Embed,
	Guild,
	GuildMember,
	GuildTextBasedChannel,
	Message,
	MessageSnapshot,
	Poll,
	Snowflake,
} from "discord.js";

import {
	channelLink,
	channelMention,
	Colors,
	hyperlink,
	MessageFlags,
	messageLink,
	MessageType,
	time,
	TimestampStyles,
	underline,
} from "discord.js";
import {
	client,
	escapeAllMarkdown,
	footerSeperator,
	formatAnyEmoji,
	getFilesFromMessage,
	isFileExpired,
	mentionChatCommand,
	stripMarkdown,
} from "strife.js";

import config from "../common/config.ts";
import constants from "../common/constants.ts";
import { formatDuration } from "./numbers.ts";
import { truncateText } from "./text.ts";

export async function extractMessageExtremities(
	message: Message,
	forceRefetch?: boolean,
): Promise<{ embeds: APIEmbed[]; files: Attachment[] }>;
export async function extractMessageExtremities(
	message: MessageSnapshot,
	forceRefetch: false,
): Promise<{ embeds: APIEmbed[]; files: Attachment[] }>;
export async function extractMessageExtremities(
	message: Message | MessageSnapshot,
	forceRefetch = true,
): Promise<{ embeds: APIEmbed[]; files: Attachment[] }> {
	const embeds = [];
	for (const { data } of message.flags.has(MessageFlags.SuppressEmbeds) ? [] : message.embeds) {
		if (
			forceRefetch &&
			message.fetch &&
			((data.footer?.icon_url && isFileExpired(data.footer.icon_url)) ||
				(data.image && isFileExpired(data.image.url)) ||
				(data.thumbnail && isFileExpired(data.thumbnail.url)) ||
				(data.video?.url && isFileExpired(data.video.url)) ||
				(data.author?.icon_url && isFileExpired(data.author.icon_url)))
		)
			return await extractMessageExtremities(await message.fetch(true), false);

		const automodInfo =
			message.type === MessageType.AutoModerationAction &&
			indexEmbedFields(data, {
				flagged_message_id: message.id ?? "0",
				channel_id: message.channel?.id ?? "0",
				keyword: "",
				rule_name: "",
			});
		const pollInfo =
			message.type === MessageType.PollResult &&
			indexEmbedFields(data, {
				poll_question_text: "",
				victor_answer_votes: "0",
				total_votes: "0",
				victor_answer_id: undefined,
				victor_answer_text: undefined,
				victor_answer_emoji_id: undefined,
				victor_answer_emoji_name: undefined,
				victor_answer_emoji_animated: undefined,
			});

		const pollVotes = pollInfo && +pollInfo.total_votes;
		const pollVictorEmoji =
			pollInfo &&
			formatAnyEmoji({
				animated: !!pollInfo.victor_answer_emoji,
				id: pollInfo.victor_answer_id,
				name: pollInfo.victor_answer_name,
			});

		const user = message.member ?? message.author;

		const newEmbed: APIEmbed =
			automodInfo ?
				{
					description: message.content,
					color: message.member?.displayColor,
					author:
						user ?
							{ icon_url: user.displayAvatarURL(), name: user.displayName }
						:	undefined,
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
				}
			: pollInfo ?
				{
					description:
						pollVotes ?
							pollInfo.victor_answer_id ?
								`${pollVictorEmoji ? `${pollVictorEmoji} ` : ""}${
									pollInfo.victor_answer_text ?
										`${pollInfo.victor_answer_text} `
									:	""
								}${constants.emojis.message.checkmark}`
							:	"The results were tied"
						:	`${constants.emojis.message.sad} There was no winner`,
					footer: {
						text:
							(pollInfo.victor_answer_id ? `Winning answer` : "") +
							(pollInfo.victor_answer_id && pollVotes ? footerSeperator : "") +
							(pollVotes ?
								(+pollInfo.victor_answer_votes / pollVotes).toLocaleString([], {
									style: "percent",
									maximumFractionDigits: 1,
								})
							:	""),
					},
				}
			:	{ ...data };

		embeds.push(newEmbed);
	}

	const extraData =
		message.poll ? [pollToEmbed(message.poll)]
		: message.type === MessageType.PurchaseNotification ?
			[
				{
					image: {
						url: `${constants.domains.scradd}/images/discord-purchase-notification.png`,
					},
					description:
						message.author ? `Thank you, **${message.author.displayName}**` : undefined,
					thumbnail:
						message.author ?
							{
								url: message.author.displayAvatarURL({
									extension: "webp",
									size: 64,
									forceStatic: true,
								}),
							}
						:	undefined,
				},
			]
		:	[];

	const stickers = message.stickers.map(
		(sticker): APIEmbed => ({
			color: Colors.Blurple,
			image: { url: sticker.url },
			footer: { text: sticker.name },
		}),
	);

	const files = (
		forceRefetch && !message.partial ?
			await getFilesFromMessage(message)
		:	message.attachments.filter((file) => !isFileExpired(file.url))).values();

	const snapshots = await Promise.all(
		message.messageSnapshots?.map((snapshot) => extractMessageExtremities(snapshot, false)) ??
			[],
	);

	return {
		embeds: [
			...extraData,
			...embeds,
			...stickers,
			...snapshots.flatMap((snapshot) => snapshot.embeds),
		].slice(0, 10),
		files: [...files, ...snapshots.flatMap((snapshot) => snapshot.files)].slice(0, 10),
	};
}

export function pollToEmbed(poll: Poll): APIEmbed {
	const votes = poll.answers.reduce((total, answer) => total + answer.voteCount, 0);
	const winner =
		poll.resultsFinalized &&
		votes !== 0 &&
		poll.answers.sorted((one, two) => two.voteCount - one.voteCount).first()?.voteCount;
	return {
		title: poll.question.text,
		description:
			poll.resultsFinalized ? undefined
			: poll.allowMultiselect ? "Select one or more answers"
			: "Select one answer",
		fields: poll.answers.map((answer) => {
			const name =
				(answer.emoji ? formatAnyEmoji(answer.emoji) : "") +
				(answer.emoji && answer.text ? " " : "") +
				(answer.text ?? "");
			const counts = `${answer.voteCount.toLocaleString()} votes (${(
				answer.voteCount / (votes || 1)
			).toLocaleString([], { style: "percent", maximumFractionDigits: 1 })})`;
			return answer.voteCount === winner ?
					{
						name: underline(name),
						value: underline(`${counts} ${constants.emojis.message.checkmark}`),
					}
				:	{ name, value: counts };
		}),
		footer: {
			text: `${votes} vote${votes === 1 ? "" : "s"}${
				poll.resultsFinalized ? footerSeperator + "Poll closed" : ""
			}`,
		},
		timestamp: poll.resultsFinalized ? undefined : poll.expiresAt.toISOString(),
	} satisfies APIEmbed;
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
 *   `system_content`](https://github.com/Rapptz/discord.py/blob/7db879b/discord/message.py#L239-L2814)
 * @param message - Message to convert.
 * @param references - Whether to fetch references or show a reply line.
 * @returns Text representation of the message.
 */
export function messageToText(message: Message | MessageSnapshot, references: false): string;
export function messageToText(message: Message, references?: true): Awaitable<string>;
export function messageToText(
	message: Message | MessageSnapshot,
	references = true,
): Awaitable<string> {
	const loadingMessage =
		message.flags.has("Loading") &&
		((Date.now() - message.createdTimestamp) / 1000 / 60 > 15 ?
			`${constants.emojis.message.error} The application did not respond`
		:	`${constants.emojis.misc.loading} ${escapeAllMarkdown(
				message.author?.displayName ?? "The application",
				// eslint-disable-next-line unicorn/string-content
			)} is thinking...`);
	const snapshots = message.messageSnapshots
		?.map((snapshot) => {
			const text = messageToText(snapshot, false)
				.split("\n")
				.map((line) => (line.startsWith("> ") ? line : `> ${line}`))
				.join("\n");
			return `> *${constants.emojis.message.forward} Forwarded${text ? `\n${text}` : ""}`;
		})
		.join("\n\n");

	const content =
		loadingMessage ||
		(snapshots && message.content ?
			`${snapshots}\n\n${message.content}`
		:	snapshots || message.content);

	if (message.partial) return content;

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
			if (!message.call)
				return `${constants.emojis.message.call} ${message.author.toString()} started a call.`;

			const participated = message.call.participants.includes(message.author.id);

			if (message.call.endedTimestamp) {
				const duration = formatDuration(
					message.call.endedTimestamp - message.createdTimestamp,
				);
				return participated ?
						`${message.author.toString()} started a call that lasted ${duration}.`
					:	`You missed a call from ${message.author.toString()} that lasted ${duration}.`;
			} else {
				return `${message.author.toString()} started a call.${participated ? "" : " — Join the call"}`;
			}
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
			if (!references)
				return `${
					constants.emojis.message.pin
				} ${message.author.toString()} pinned **a message** to this channel. See all **pinned messages**.`;

			return `${constants.emojis.message.pin} ${message.author.toString()} pinned ${
				message.reference?.messageId ?
					`[a message](<${messageLink(
						message.reference.guildId ?? message.guild?.id ?? "@me",
						message.reference.channelId,
						message.reference.messageId,
					)}>`
				:	"a message"
			}) to this channel. See all [pinned messages](<${message.channel.url}>).`;
		}
		case MessageType.UserJoin: {
			const formats =
				message.guild?.features.includes("CLAN") ?
					([
						`Everyone welcome ${message.author.toString()} to the Guild!`,
						`A new member has spawned. Say hi to ${message.author.toString()}.`,
						`${message.author.toString()} just joined the Guild. We hope you brought pizza.`,
						// eslint-disable-next-line unicorn/string-content
						`Glad you're here, ${message.author.toString()}, welcome to the Guild.`,
						`New recruit! ${message.author.toString()} joined the Guild.`,
						`Round of applause for the newest Guild member, ${message.author.toString()}. Just for being here.`,
						`Rolling out the red carpet for ${message.author.toString()}. Say hi!`,
						`Yahaha! ${message.author.toString()} found us!`,
						`Get ready everyone -- a ${message.author.toString()} has appeared!`,
						`Roses are red, violets are blue, ${message.author.toString()} just joined the Guild with you.`,
					] as const)
				:	([
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
					] as const);

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
			return `${
				constants.emojis.message.success
			} This server is eligible for Server Discovery again and has been automatically relisted!`;
		}
		case MessageType.GuildDiscoveryGracePeriodInitialWarning: {
			return `${
				constants.emojis.message.warning
			} This server has failed Discovery activity requirements for 1 week. If this server fails for 4 weeks in a row, it will be automatically removed from Discovery.`;
		}
		case MessageType.GuildDiscoveryGracePeriodFinalWarning: {
			return `${
				constants.emojis.message.warning
			} This server has failed Discovery activity requirements for 3 weeks in a row. If this server fails for 1 more week, it will be removed from Discovery.`;
		}
		case MessageType.ThreadCreated: {
			return `${
				constants.emojis.message.thread
			} ${message.author.toString()} started a thread: [${escapeAllMarkdown(
				content,
			)}](<${channelLink(
				message.reference?.guildId ?? message.guild?.id ?? "@me",
				message.reference?.channelId ?? message.id,
			)}>) See all [threads](<${message.channel.url}>).`;
		}
		case MessageType.Reply: {
			if (!references) break;
			const replyLink = `<${messageLink(
				message.reference?.guildId ?? message.guild?.id ?? "@me",
				message.reference?.channelId ?? message.channel.id,
				message.reference?.messageId ?? message.id,
			)}>` as const;

			return message
				.fetchReference()
				.catch(() => void 0)
				.then((reply) => {
					if (!reply) {
						return `*${
							constants.emojis.message.reply
						}[ Original message was deleted](${replyLink})*\n\n${content}`;
					}
					const cleanContent = messageToText(reply, false).replaceAll(/\s+/g, " ");
					const replyContent =
						cleanContent && `\n> ${truncateText(stripMarkdown(cleanContent), 300)}`;
					return `*[Replying to ](${replyLink})${reply.author.toString()}${
						replyContent && `:`
					}*${replyContent}\n\n${content}`;
				});
		}
		case MessageType.ChatInputCommand: {
			if (!references || !message.interaction) break;

			const userPing = message.interaction.user.toString();
			return mentionChatCommand(
				message.interaction.commandName,
				message.guild ?? undefined,
			).then(
				(formatted) => `*${userPing} used ${formatted}${content ? `:*\n${content}` : "*"}`,
			);
		}
		case MessageType.ThreadStarterMessage: {
			const failMessage = `${
				constants.emojis.message.thread
				// eslint-disable-next-line unicorn/string-content
			} Sorry, we couldn't load the first message in this thread`;
			if (!message.reference) return failMessage;

			if (!references) break;

			return message
				.fetchReference()
				.catch(() => void 0)
				.then(async (reference) =>
					reference ?
						(await messageToText(reference, references)) || content
					:	failMessage,
				);
		}
		case MessageType.GuildInviteReminder: {
			return "Wondering who to invite?\nStart by inviting anyone who can help you build the server!";
		}
		case MessageType.ContextMenuCommand: {
			if (!references || !message.interaction) break;
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
				} **${escapeAllMarkdown(tierName)}** ${months ? "and has been" : "as"} a subscriber of ` +
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
			} ${message.author.toString()} started **${escapeAllMarkdown(content)}**`;
		}
		case MessageType.StageEnd: {
			return `${
				constants.emojis.message.stage
			} ${message.author.toString()} ended **${escapeAllMarkdown(content)}**`;
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
			} ${message.author.toString()} changed the Stage topic: **${escapeAllMarkdown(content)}**`;
		}
		case MessageType.GuildApplicationPremiumSubscription: {
			return `${
				constants.emojis.message.subscription
			} ${message.author.toString()} upgraded ${
				message.groupActivityApplication?.name ?? `a deleted application`
			} to premium for this server! 🎉`;
		}
		case MessageType.GuildIncidentAlertModeEnabled: {
			const date = new Date(message.content);
			return `${message.author.toString()} enabled security actions until ${time(
				date,
				TimestampStyles.ShortDate,
			)}, ${time(date, TimestampStyles.ShortTime)}.`;
		}
		case MessageType.GuildIncidentAlertModeDisabled: {
			return `${message.author.toString()} disabled security actions.`;
		}
		case MessageType.GuildIncidentReportRaid: {
			return `${message.author.toString()} reported a raid in ${escapeAllMarkdown(
				message.guild?.name ?? "",
			)}.`;
		}
		case MessageType.GuildIncidentReportFalseAlarm: {
			return `${message.author.toString()} resolved an Activity Alert.`;
		}
		case MessageType.PurchaseNotification: {
			const purchaseNotification =
				"purchaseNotification" in message ?
					(message.purchaseNotification as {
						type: 0;
						guildProductPurchase?: { listingId: Snowflake; productName: string };
					})
				:	undefined;
			return `${message.author.toString()} has purchased [${
				purchaseNotification?.guildProductPurchase?.productName ?? ""
			}](<https://discord.com/channels/${message.channel.id}/shop/${
				purchaseNotification?.guildProductPurchase?.listingId ?? ""
			}>)!`;
		}
		case MessageType.PollResult: {
			// eslint-disable-next-line unicorn/string-content
			return `${constants.emojis.message.poll} ${message.author.toString()}'s poll [${
				indexEmbedFields(message.embeds[0] ?? {}, { poll_question_text: "" })
					.poll_question_text
			}](<${messageLink(
				message.reference?.guildId ?? message.guild?.id ?? "@me",
				message.reference?.channelId ?? message.channel.id,
				message.reference?.messageId ?? message.id,
			)}>) has closed.`;
		}
	}

	return content;
}

const autoModMessages = new Set([
	MessageType.AutoModerationAction,
	MessageType.GuildIncidentAlertModeEnabled,
	MessageType.GuildIncidentAlertModeDisabled,
	MessageType.GuildIncidentReportRaid,
	MessageType.GuildIncidentReportFalseAlarm,
]);

export async function messageToEmbed(message: Message): Promise<APIEmbed> {
	const lines = (await messageToText(message)).split("\n");
	const content =
		message.type === MessageType.GuildInviteReminder ? (lines[1] ?? "") : lines.join("\n");
	const author =
		message.type === MessageType.AutoModerationAction ? content
		: message.type === MessageType.GuildInviteReminder ? lines[0]
		: autoModMessages.has(message.type) ? "AutoMod"
		: (message.member ?? message.author).displayName +
			(message.author.bot || message.webhookId ? " 🤖" : "");
	return {
		color:
			autoModMessages.has(message.type) ? 0x99_a1_f2
			: message.type === MessageType.GuildInviteReminder ? undefined
			: message.member?.displayColor,
		description: message.type === MessageType.AutoModerationAction ? "" : content,

		author: {
			icon_url:
				autoModMessages.has(message.type) ?
					"https://discord.com/assets/e7af5fc8fa27c595d963c1b366dc91fa.gif"
				: message.type === MessageType.GuildInviteReminder ?
					"https://discord.com/assets/e4c6bb8de56c299978ec36136e53591a.svg"
				:	(message.member ?? message.author).displayAvatarURL(),

			name: author,
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

function indexEmbedFields<
	T extends Record<string, string | undefined> = Record<string, string | undefined>,
>(
	embed: APIEmbed | Embed,
	defaults: T,
): { [key in keyof T]: T[key] | string } & Record<string, string | undefined>;
function indexEmbedFields(
	embed: APIEmbed | Embed,
	defaults?: undefined,
): Record<string, string | undefined>;
function indexEmbedFields(
	embed: APIEmbed | Embed,
	defaults: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
	return (embed.fields ?? []).reduce(
		(accumulator, field) => ({ ...accumulator, [field.name]: field.value }),
		defaults,
	);
}
