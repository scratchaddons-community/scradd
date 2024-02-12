import { unifiedDiff } from "difflib";
import {
	type Message,
	type PartialMessage,
	type Collection,
	type GuildTextBasedChannel,
	type MessageReaction,
	Colors,
	messageLink,
	type Snowflake,
} from "discord.js";
import config from "../../common/config.js";
import { getBaseChannel, messageToText, extractMessageExtremities } from "../../util/discord.js";
import log, { LogSeverity, shouldLog, LoggingEmojis } from "./misc.js";
import { joinWithAnd } from "../../util/text.js";
import { databaseThread } from "../../common/database.js";

export const ignoredDeletions = new Set<Snowflake>();

export async function messageDelete(message: Message | PartialMessage) {
	if (
		!shouldLog(message.channel) ||
		message.flags.has("Ephemeral") ||
		ignoredDeletions.delete(message.id)
	)
		return;
	const shush =
		message.partial ||
		(config.channels.modlogs?.id === getBaseChannel(message.channel)?.id &&
			databaseThread.id !== message.channel.id);

	const content = !shush && messageToText(message, false);
	const { embeds, files } = shush
		? { embeds: [], files: [] }
		: extractMessageExtremities(message);

	await log(
		`${LoggingEmojis.MessageDelete} ${message.partial ? "Unknown message" : "Message"}${
			message.author ? ` by ${message.author.toString()}` : ""
		} in ${message.channel.toString()} (ID: ${message.id}) deleted`,
		LogSeverity.ContentEdit,
		{
			embeds,
			buttons: [
				{ label: "Context", url: message.url },
				...(message.reference?.messageId
					? [
							{
								label: "Reference",
								url: messageLink(
									message.reference.guildId ?? "@me",
									message.reference.channelId,
									message.reference.messageId,
								),
							},
					  ]
					: []),
			],

			files: content
				? [{ content, extension: "md" }, ...files.map((file) => file.url)]
				: files.map((file) => file.url),
		},
	);
}
export async function messageDeleteBulk(
	messages: Collection<string, Message | PartialMessage>,
	channel: GuildTextBasedChannel,
) {
	if (!shouldLog(channel)) return;
	const messagesInfo = (
		await Promise.all(
			messages.toReversed().map(async (message) => {
				const embeds = `${message.embeds.length ? `${message.embeds.length} embed` : ""}${
					message.embeds.length > 1 ? "s" : ""
				}`;
				const attachments = `${
					message.attachments.size ? `${message.attachments.size} attachment` : ""
				}${message.attachments.size > 1 ? "s" : ""}`;
				const extremities =
					message.embeds.length || message.attachments.size
						? ` (${embeds}${embeds && attachments && ", "}${attachments})`
						: "";

				const author = message.author
					? `${message.author.tag} - ${message.author.id}`
					: "[unknown author]";
				const content = !message.partial && (await messageToText(message));

				return `${author}${extremities}${content ? `:\n${content}` : ""}`;
			}),
		)
	).join("\n\n---\n\n");

	const allAuthors = messages.map(({ author }) => author?.toString());
	const unknownCount = allAuthors.filter((author) => !author).length;
	const authors = [
		...new Set(allAuthors.filter(Boolean)),
		...(unknownCount ? [`${unknownCount} unknown users`] : []),
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
export async function messageReactionRemoveAll(
	partialMessage: Message | PartialMessage,
	reactions: Collection<string, MessageReaction>,
) {
	const message = partialMessage.partial ? await partialMessage.fetch() : partialMessage;

	if (!shouldLog(message.channel)) return;

	await log(
		`${
			LoggingEmojis.Expressions
		} Reactions purged on message by ${message.author.toString()} in ${message.channel.toString()} (ID: ${
			message.id
		})`,
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

			buttons: [{ label: "Message", url: message.url }],
		},
	);
}
export async function messageUpdate(
	oldMessage: Message | PartialMessage,
	newMessage: Message | PartialMessage,
) {
	if (newMessage.partial) return;
	if (!shouldLog(newMessage.channel) || newMessage.flags.has("Ephemeral")) return;

	if (oldMessage.flags.has("Crossposted") !== newMessage.flags.has("Crossposted")) {
		await log(
			`${
				LoggingEmojis.MessageUpdate
			} Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} (ID: ${
				newMessage.id
			}) ${newMessage.flags.has("Crossposted") ? "" : "un"}published`,
			LogSeverity.ServerChange,
			{ buttons: [{ label: "Message", url: newMessage.url }] },
		);
	}
	if (oldMessage.flags.has("SuppressEmbeds") !== newMessage.flags.has("SuppressEmbeds")) {
		await log(
			`${LoggingEmojis.MessageUpdate} Embeds ${
				newMessage.flags.has("SuppressEmbeds") ? "removed from" : "shown on"
			} message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} (ID: ${
				newMessage.id
			})`,
			LogSeverity.ContentEdit,
			{ buttons: [{ label: "Message", url: newMessage.url }], embeds: oldMessage.embeds },
		);
	}

	if (!oldMessage.partial && oldMessage.pinned !== newMessage.pinned) {
		await log(
			`${
				LoggingEmojis.MessageUpdate
			} Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} (ID: ${
				newMessage.id
			}) ${newMessage.pinned ? "" : "un"}pinned`,
			LogSeverity.ImportantUpdate,
			{ buttons: [{ label: "Message", url: newMessage.url }] },
		);
	}

	if (!oldMessage.partial && !newMessage.author.bot) {
		const files = [];
		const contentDiff = unifiedDiff(
			oldMessage.content.split("\n"),
			newMessage.content.split("\n"),
			{ lineterm: "" },
		)
			.join("\n")
			.replace(/^-{3} \n\+{3} \n/, "");
		if (contentDiff) files.push({ content: contentDiff, extension: "diff" });

		const changedFiles = new Set(newMessage.attachments.map((attachment) => attachment.url));
		files.push(
			...oldMessage.attachments
				.map((attachment) => attachment.url)
				.filter((attachment) => !changedFiles.has(attachment)),
		);

		if (files.length) {
			await log(
				`${
					LoggingEmojis.MessageEdit
				} Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} (ID: ${
					newMessage.id
				}) edited`,
				LogSeverity.ContentEdit,
				{ buttons: [{ label: "Message", url: newMessage.url }], files },
			);
		}
	}
}
