import {
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	ComponentType,
	EmbedBuilder,
	Message,
} from "discord.js";
import { guild } from "../client.js";
import { extractMessageExtremities, messageToText } from "../lib/message.js";
import { MessageActionRowBuilder } from "../types/ActionRowBuilder.js";
import { extractData, getDatabases, queueDatabaseWrite } from "./databases.js";

import { censor } from "./moderation/automod.js";

export const BOARD_CHANNEL = process.env.BOARD_CHANNEL ?? "";
export const BOARD_EMOJI = "🥔";
export const MIN_REACTIONS = process.env.NODE_ENV === "production" ? 8 : 2;

const board = await guild.channels.fetch(BOARD_CHANNEL);
if (!board?.isTextBased()) throw new ReferenceError("Could not find board channel");

const { board: database } = await getDatabases(["board"]);

/**
 * @param {BoardDatabaseItem | import("discord.js").Message} info
 * @param {ButtonBuilder[]} [extraButtons]
 *
 * @returns {Promise<import("discord.js").WebhookEditMessageOptions | undefined>}
 */
export async function generateMessage(info, extraButtons = []) {
	const count =
		info instanceof Message ? info.reactions.resolve(BOARD_EMOJI)?.count || 0 : info.reactions;
	/**
	 * @param {import("discord.js").Message} message
	 *
	 * @returns {Promise<import("discord.js").WebhookEditMessageOptions | undefined>}
	 */
	async function messageToBoardData(message) {
		const { files, embeds } = await extractMessageExtremities(message, false);

		const description = await messageToText(message);

		const censored = censor(description);
		const censoredName = censor(message.author.username);

		const boardEmbed = new EmbedBuilder()
			.setColor(message.member?.displayColor ?? 0)
			.setDescription(censored ? censored.censored : description || null)
			.setAuthor({
				iconURL: (message.member ?? message.author).displayAvatarURL(),
				name:
					message.member?.displayName ??
					(censoredName ? censoredName.censored : message.author.username),
			})
			.setTimestamp(message.createdAt);

		const button = new ButtonBuilder()
			.setLabel("View Context")
			.setStyle(ButtonStyle.Link)
			.setURL(message.url);

		while (embeds.length > 9) embeds.pop(); // 9 and not 10 because we still need to add ours

		return {
			allowedMentions: { users: [] },
			components: [new MessageActionRowBuilder().addComponents(button, ...extraButtons)],

			content: `**${BOARD_EMOJI} ${count}** | ${message.channel.toString()}${
				message.channel.isThread() ? ` (${message.channel.parent?.toString() ?? ""})` : ""
			} | ${message.author.toString()}`,
			embeds: [boardEmbed, ...embeds],
			files,
		};
	}

	if (info instanceof Message) return messageToBoardData(info);
	if (!board?.isTextBased()) throw new ReferenceError("Could not find board channel");
	const onBoard = info.onBoard && (await board.messages.fetch(info.onBoard).catch(() => {}));
	if (onBoard) {
		const linkButton = onBoard.components?.[0]?.components?.[0];
		const buttons =
			linkButton?.type === ComponentType.Button
				? [ButtonBuilder.from(linkButton), ...extraButtons]
				: extraButtons;
		return {
			allowedMentions: { users: [] },

			components: buttons.length
				? [new MessageActionRowBuilder().setComponents(buttons)]
				: [],

			content: onBoard.content,
			embeds: onBoard.embeds.map((oldEmbed) => EmbedBuilder.from(oldEmbed)),
			files: onBoard.attachments.map((attachment) => attachment),
		};
	}
	const channel = await guild.channels.fetch(info.channel);
	if (!channel?.isTextBased()) return;
	const message = await channel.messages.fetch(info.source).catch(() => {});
	if (!message) return;
	return messageToBoardData(message);
}

/**
 * Update the count on a message on #potatoboard.
 *
 * @param {import("discord.js").Message} message
 */
export async function updateBoard(message) {
	const count = message.reactions.resolve(BOARD_EMOJI)?.count || 0;
	const data = await /** @type {Promise<import("../common/board.js").BoardDatabaseItem[]>} */ (
		extractData(database)
	);
	const info = data.find(({ source }) => source === message.id);
	if (info?.onBoard) {
		if (!board?.isTextBased()) throw new ReferenceError("Could not find board channel");

		const boardMessage = await board?.messages.fetch(info.onBoard);
		if (count < Math.max(Math.round(MIN_REACTIONS - MIN_REACTIONS / 6), 1)) {
			await boardMessage.delete();
		} else {
			await boardMessage.edit({
				allowedMentions: process.env.NODE_ENV === "production" ? undefined : { users: [] },
				content: boardMessage.content.replace(/\d+/, `${count}`),
			});
		}
	} else if (count >= MIN_REACTIONS) {
		if (!board?.isTextBased()) throw new ReferenceError("Could not find board channel");

		const boardMessage = await board?.send({
			allowedMentions: process.env.NODE_ENV === "production" ? undefined : { users: [] },
			...(await generateMessage(message)),
		});
		if (board.type === ChannelType.GuildNews) await boardMessage.crosspost();
		if (info) {
			queueDatabaseWrite(
				database,
				data.map((item) =>
					item.source === message.id
						? { ...item, reactions: count, onBoard: boardMessage.id }
						: item,
				),
			);
			return;
		}
	}
	queueDatabaseWrite(
		database,
		info
			? count
				? data.map((item) =>
						item.source === message.id ? { ...item, reactions: count } : item,
				  )
				: data.filter((item) => item.source !== message.id)
			: count
			? [
					...data,
					{
						reactions: count,
						user: message.author.id,
						channel: message.channel.id,
						source: message.id,
					},
			  ]
			: data,
	);
}

/**
 * @typedef {object} BoardDatabaseItem
 *
 * @property {number} reactions - The number of reactions this message has.
 * @property {import("discord.js").Snowflake} user - The ID of the user who posted this.
 * @property {import("discord.js").Snowflake} channel - The ID of the channel this message is in.
 * @property {import("discord.js").Snowflake} [onBoard] - The ID of the message on the board.
 * @property {import("discord.js").Snowflake} source - The ID of the original message.
 */
