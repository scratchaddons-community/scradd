import { unifiedDiff } from "difflib";
import {
	type Message,
	type PartialMessage,
	type Collection,
	type GuildTextBasedChannel,
	type MessageReaction,
	Colors,
} from "discord.js";
import { diffString } from "json-diff";
import config from "../../common/config.js";
import { DATABASE_THREAD } from "../../common/database.js";
import {
	getBaseChannel,
	messageToText,
	extractMessageExtremities,
	getMessageJSON,
} from "../../util/discord.js";
import log, { shouldLog, LoggingEmojis, getLoggingThread } from "./misc.js";

const databaseThread = await getLoggingThread(DATABASE_THREAD);
export async function messageDelete(message: Message<boolean> | PartialMessage) {
	if (!shouldLog(message.channel) || message.flags.has("Ephemeral")) return;
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
		"messages",
		{
			embeds,
			buttons: [
				{ label: "Context", url: message.url },
				...(message.reference
					? [
							{
								label: "Referenced Message",
								url: `https://discord.com/${message.reference.guildId}/${message.reference.channelId}/${message.reference.messageId}`,
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
	messages: Collection<string, Message<boolean> | PartialMessage>,
	channel: GuildTextBasedChannel,
) {
	if (!shouldLog(channel)) return;
	const messagesInfo = (
		await Promise.all(
			messages.reverse().map(async (message) => {
				const content = !message.partial && (await messageToText(message));

				return `${message.author?.tag ?? "[unknown]"}${
					message.embeds.length > 0 || message.attachments.size > 0 ? " (" : ""
				}${message.embeds.length > 0 ? `${message.embeds.length} embeds` : ""}${
					message.embeds.length > 0 && message.attachments.size > 0 ? ", " : ""
				}${message.attachments.size > 0 ? `${message.attachments.size} attachments` : ""}${
					message.embeds.length > 0 || message.attachments.size > 0 ? ")" : ""
				}${content ? `:\n${content}` : ""}`;
			}),
		)
	).join("\n\n---\n\n");

	await log(
		`${LoggingEmojis.MessageDelete} ${
			messages.size
		} messages in ${channel.toString()} bulk deleted`,
		"messages",
		{
			files: [{ content: messagesInfo, extension: "md" }],
			buttons: [{ label: "Context", url: messages.first()?.url ?? "" }],
		},
	);
}
export async function messageReactionRemoveAll(
	partialMessage: Message<boolean> | PartialMessage,
	reactions: Collection<string, MessageReaction>,
) {
	const message = partialMessage.partial ? await partialMessage.fetch() : partialMessage;

	if (!shouldLog(message.channel)) return;

	await log(
		`${
			LoggingEmojis.Emoji
		} Reactions purged on message by ${message.author.toString()} in ${message.channel.toString()} (ID: ${
			message.id
		})`,
		"messages",
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

			buttons: [{ label: "Context", url: message.url }],
		},
	);
}
export async function messageUpdate(
	oldMessage: Message<boolean> | PartialMessage,
	partialMessage: Message<boolean> | PartialMessage,
) {
	const newMessage = partialMessage.partial ? await partialMessage.fetch() : partialMessage;
	if (!shouldLog(newMessage.channel) || newMessage.flags.has("Ephemeral")) return;

	if (oldMessage.flags.has("Crossposted") !== newMessage.flags.has("Crossposted")) {
		await log(
			`${
				LoggingEmojis.MessageUpdate
			} Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} (ID: ${
				newMessage.id
			}) ${newMessage.flags.has("Crossposted") ? "" : "un"}published`,
			"messages",
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
			"messages",
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
			"messages",
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
			.replace(/^--- \n\+\+\+ \n/, "");
		if (contentDiff) files.push({ content: contentDiff, extension: "diff" });

		const extraDiff = diffString(
			{ ...getMessageJSON(oldMessage), content: undefined, embeds: undefined },
			{ ...getMessageJSON(newMessage), content: undefined, embeds: undefined },
			{ color: false },
		);
		if (extraDiff) {
			const updatedFiles = newMessage.attachments.map((attachment) => attachment.url);
			files.push(
				{ content: extraDiff, extension: "diff" },
				...oldMessage.attachments
					.map((attachment) => attachment.url)
					.filter((attachment) => !updatedFiles.includes(attachment)),
			);
		}

		if (files.length > 0) {
			await log(
				`${
					LoggingEmojis.MessageEdit
				} Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} (ID: ${
					newMessage.id
				}) edited`,
				"messages",
				{ buttons: [{ label: "Message", url: newMessage.url }], files },
			);
		}
	}
}
