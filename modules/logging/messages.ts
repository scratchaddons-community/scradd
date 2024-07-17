import { unifiedDiff } from "difflib";
import {
	Colors,
	messageLink,
	type ReadonlyCollection,
	type GuildTextBasedChannel,
	type Message,
	type MessageReaction,
	type PartialMessage,
	type Snowflake,
} from "discord.js";
import config from "../../common/config.js";
import { databaseThread } from "../../common/database.js";
import {
	extractMessageExtremities,
	getBaseChannel,
	isFileExpired,
	messageToText,
	unsignFiles,
} from "../../util/discord.js";
import { joinWithAnd } from "../../util/text.js";
import log, { LogSeverity, LoggingEmojis, shouldLog } from "./misc.js";

export const ignoredDeletions = new Set<Snowflake>();

export async function messageDelete(message: Message | PartialMessage): Promise<void> {
	if (
		!shouldLog(message.channel) ||
		message.flags.has("Ephemeral") ||
		ignoredDeletions.delete(message.id)
	)
		return;
	const shush =
		message.partial ||
		(config.channels.modlogs.id === getBaseChannel(message.channel)?.id &&
			databaseThread.id !== message.channel.id);

	const content = !shush && messageToText(message, false);
	const { embeds, files } =
		shush ?
			{ embeds: [], files: [] }
		:	await extractMessageExtremities(message, undefined, false);

	const unknownAttachments = message.attachments.filter(isFileExpired);

	await log(
		`${LoggingEmojis.MessageDelete} ${message.partial ? "Unknown message" : "Message"}${
			message.author ? ` by ${message.author.toString()}` : ""
		} in ${message.channel.toString()} (ID: ${message.id}) deleted${
			unknownAttachments.size ? `\n ${unknownAttachments.size} unknown attachment` : ""
		}${unknownAttachments.size > 1 ? "s" : ""}`,
		LogSeverity.ContentEdit,
		{
			embeds,
			buttons: [
				{ label: "Context", url: message.url },
				...(message.reference?.messageId ?
					[
						{
							label: "Reference",
							url: messageLink(
								message.reference.channelId,
								message.reference.messageId,
								message.reference.guildId ?? "@me",
							),
						},
					]
				:	[]),
			],

			files:
				content ?
					[{ content, extension: "md" }, ...files.map((file) => file.url)]
				:	files.map((file) => file.url),
		},
	);
}
export async function messageDeleteBulk(
	messages: ReadonlyCollection<string, Message | PartialMessage>,
	channel: GuildTextBasedChannel,
): Promise<void> {
	if (!shouldLog(channel)) return;
	const messagesInfo = (
		await Promise.all(
			messages
				.map(async (message) => {
					const embeds = `${message.embeds.length ? `${message.embeds.length} embed` : ""}${
						message.embeds.length > 1 ? "s" : ""
					}`;
					const attachments = `${
						message.attachments.size ? `${message.attachments.size} attachment` : ""
					}${message.attachments.size > 1 ? "s" : ""}`;
					const extremities =
						embeds || attachments ?
							` (${embeds}${embeds && attachments && ", "}${attachments})`
						:	"";

					const author =
						message.author ?
							`${message.author.tag} - ${message.author.id}`
						:	"[unknown author]";
					const content = !message.partial && (await messageToText(message));

					return `${author}${extremities}${content ? `:\n${content}` : ""}`;
				})
				.toReversed(),
		)
	).join("\n\n---\n\n");

	const allAuthors = messages.map(({ author }) => author?.toString());
	const unknownCount = allAuthors.filter((author) => !author).length;
	const authors = [
		...new Set(allAuthors.filter(Boolean)),
		...(unknownCount ?
			[`at least ${unknownCount} unknown user${unknownCount === 1 ? "" : "s"}`]
		:	[]),
	];

	const url = messages.first()?.url;
	await log(
		`${LoggingEmojis.MessageDelete} ${messages.size} messages by ${joinWithAnd(
			authors,
		)} in ${channel.toString()} bulk deleted`,
		LogSeverity.ContentEdit,
		{
			files: [{ content: messagesInfo, extension: "md" }],
			buttons: url ? [{ label: "Context", url }] : [],
		},
	);
}
export const ignoredReactionPurges = new Set<Snowflake>();
export async function messageReactionRemoveAll(
	partialMessage: Message | PartialMessage,
	reactions: ReadonlyCollection<string, MessageReaction>,
): Promise<void> {
	const message = partialMessage.partial ? await partialMessage.fetch() : partialMessage;

	if (!shouldLog(message.channel) || ignoredReactionPurges.delete(message.id)) return;

	await log(
		`${
			LoggingEmojis.Expression
		} Reactions purged on [message](<${message.url}>) by ${message.author.toString()} in ${message.channel.toString()}`,
		LogSeverity.ContentEdit,
		{
			embeds: [
				{
					fields: reactions.map((reaction) => ({
						name: reaction.emoji.toString(),
						value: `${reaction.count} reaction${reaction.count === 1 ? "" : "s"}`,
						inline: true,
					})),
					color: Colors.Blurple,
				},
			],
		},
	);
}
export async function messageUpdate(
	oldMessage: Message | PartialMessage,
	newMessage: Message | PartialMessage,
): Promise<void> {
	if (newMessage.partial) return;
	if (!shouldLog(newMessage.channel) || newMessage.flags.has("Ephemeral")) return;

	if (oldMessage.flags.has("Crossposted") !== newMessage.flags.has("Crossposted")) {
		await log(
			`${
				LoggingEmojis.MessageUpdate
			} [Message](<${newMessage.url}>) by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${newMessage.flags.has("Crossposted") ? "" : "un"}published`,
			LogSeverity.ServerChange,
		);
	}
	if (oldMessage.flags.has("SuppressEmbeds") !== newMessage.flags.has("SuppressEmbeds")) {
		await log(
			`${LoggingEmojis.MessageUpdate} Embeds ${
				newMessage.flags.has("SuppressEmbeds") ? "removed from" : "shown on"
			} [message](<${newMessage.url}>) by ${newMessage.author.toString()} in ${newMessage.channel.toString()}`,
			LogSeverity.ContentEdit,
			{ embeds: oldMessage.embeds },
		);
	}

	if (!oldMessage.partial && oldMessage.pinned !== newMessage.pinned) {
		await log(
			`${
				LoggingEmojis.MessageUpdate
			} [Message](<${newMessage.url}>) by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${newMessage.pinned ? "" : "un"}pinned`,
			LogSeverity.ServerChange,
		);
	}

	if (!newMessage.author.bot) {
		const files = [];
		const diff =
			!oldMessage.partial &&
			unifiedDiff(
				unsignFiles(oldMessage.content).split("\n"),
				unsignFiles(newMessage.content).split("\n"),
				{ lineterm: "" },
			)
				.join("\n")
				.replace(/^-{3} \n\+{3} \n/, "");
		if (diff) files.push({ content: diff, extension: "diff" });

		const removedAttachments = oldMessage.attachments.filter(
			(file) => !newMessage.attachments.has(file.id),
		);
		files.push(
			...removedAttachments
				.filter((file) => !isFileExpired(file))
				.map((attachment) => attachment.url),
		);

		if (files.length) {
			await log(
				`${LoggingEmojis.MessageEdit} [${oldMessage.partial ? "Unknown message" : "Message"}](<${
					newMessage.url
				}>) by ${newMessage.author.toString()} in ${newMessage.channel.toString()} edited${
					removedAttachments.size ?
						`\n ${removedAttachments.size} attachment${removedAttachments.size > 1 ? "s" : ""} were removed`
					:	""
				}`,
				LogSeverity.ContentEdit,
				{ files },
			);
		}
	}
}
