import {
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	ComponentType,
	EmbedBuilder,
	Message,
} from "discord.js";
import { guild } from "../client.js";
import { extractMessageExtremities, getBaseChannel, messageToText } from "../lib/discord.js";
import { MessageActionRowBuilder } from "./types/ActionRowBuilder.js";
import CONSTANTS from "./CONSTANTS.js";
import Database from "./database.js";

import { censor } from "./moderation/automod.js";
import { userSettingsDatabase } from "../commands/settings.js";
import giveXp from "./xp.js";

export const BOARD_EMOJI = "🥔";
/** @param {import("discord.js").TextBasedChannel} [channel] */
export function boardReactionCount(channel) {
	const COUNTS = { scradd: 2, devs: 6, modsPlus: 5, mods: 4, admins: 3, default: 8 };
	if (process.env.NODE_ENV !== "production") return COUNTS.scradd;
	const baseChannel = getBaseChannel(channel);
	if (!baseChannel) return COUNTS.default;
	if (baseChannel.isDMBased()) return COUNTS.mods;
	if (baseChannel.parent?.id === "866028754962612294") return COUNTS.modsPlus; // The Cache!

	return (
		{
			[CONSTANTS.channels.mod?.id || ""]: COUNTS.mods,
			[CONSTANTS.channels.admin?.id || ""]: COUNTS.admins,
			[CONSTANTS.channels.modmail?.id || ""]: COUNTS.mods,
			[CONSTANTS.channels.devs?.id || ""]: COUNTS.devs,
			[CONSTANTS.channels.boosters?.id || ""]: COUNTS.modsPlus,
			[CONSTANTS.channels.youtube?.id || ""]: COUNTS.modsPlus,
		}[baseChannel.id] || 8
	);
}

if (!CONSTANTS.channels.board) throw new ReferenceError("Could not find board channel");

export const boardDatabase = new Database("board");
await boardDatabase.init();

/**
 * @param {import("./types/databases").default["board"] | import("discord.js").Message} info
 * @param {{ pre?: ButtonBuilder[]; post?: ButtonBuilder[] }} [extraButtons]
 *
 * @returns {Promise<import("discord.js").WebhookEditMessageOptions | undefined>}
 */
export async function generateBoardMessage(info, extraButtons = {}) {
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
			components: [
				new MessageActionRowBuilder().addComponents(
					...(extraButtons.pre || []),
					button,
					...(extraButtons.post || []),
				),
			],

			content: `**${BOARD_EMOJI} ${count}** | ${message.channel.toString()}${
				message.channel.isThread()
					? ` (${
							[CONSTANTS.channels.modmail?.id, CONSTANTS.channels.admin?.id].includes(
								message.channel.parent?.id,
							)
								? "#deleted-channel"
								: message.channel.parent?.toString() ?? ""
					  })`
					: ""
			} | ${message.author.toString()}`,
			embeds: [boardEmbed, ...embeds],
			files,
		};
	}

	if (info instanceof Message) return messageToBoardData(info);
	if (!CONSTANTS.channels.board) throw new ReferenceError("Could not find board channel");
	const onBoard =
		info.onBoard &&
		(await CONSTANTS.channels.board.messages.fetch(info.onBoard).catch(() => {}));
	if (onBoard) {
		const linkButton = onBoard.components?.[0]?.components?.[0];
		const buttons =
			linkButton?.type === ComponentType.Button
				? [
						...(extraButtons.pre || []),
						ButtonBuilder.from(linkButton),
						...(extraButtons.post || []),
				  ]
				: [...(extraButtons.pre || []), ...(extraButtons.post || [])];

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
	const channel = await guild.channels.fetch(info.channel).catch(() => {});
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
	/** @type {Promise<any>[]} */
	const promises = [];
	const count = message.reactions.resolve(BOARD_EMOJI)?.count || 0;
	const minReactions = boardReactionCount(message.channel);
	const info = boardDatabase.data.find(({ source }) => source === message.id);
	if (!CONSTANTS.channels.board) throw new ReferenceError("Could not find board channel");
	const boardMessage =
		info?.onBoard &&
		(await CONSTANTS.channels.board?.messages.fetch(info.onBoard).catch(() => {}));

	const pings =
		userSettingsDatabase.data.find(({ user }) => user === message.author.id)?.boardPings ??
		true;

	if (boardMessage) {
		if (count < Math.max(Math.floor(minReactions - minReactions / 6), 0)) {
			await boardMessage.delete();
		} else {
			await boardMessage.edit({
				allowedMentions: pings ? undefined : { users: [] },
				content: boardMessage.content.replace(/\d+/, `${count}`),
			});
		}
	} else if (count >= minReactions) {
		if (!CONSTANTS.channels.board) throw new ReferenceError("Could not find board channel");
		promises.push(giveXp(message.member ?? message.author));
		const boardMessage = await CONSTANTS.channels.board.send({
			...(await generateBoardMessage(message)),
			allowedMentions: pings ? undefined : { users: [] },
		});

		if (CONSTANTS.channels.board.type === ChannelType.GuildNews)
			promises.push(boardMessage.crosspost());

		boardDatabase.data = info
			? boardDatabase.data.map((item) =>
					item.source === message.id
						? { ...item, onBoard: boardMessage.id, reactions: count }
						: item,
			  )
			: [
					...boardDatabase.data,
					{
						reactions: count,
						user: message.author.id,
						channel: message.channel.id,
						source: message.id,
						onBoard: boardMessage.id,
					},
			  ];
	}

	if (boardMessage || count < minReactions) {
		boardDatabase.data = count
			? boardDatabase.data.map((item) =>
					item.source === message.id ? { ...item, reactions: count } : item,
			  )
			: boardDatabase.data.filter((item) => item.source !== message.id);
	}

	const top = boardDatabase.data
		.sort((a, b) => b.reactions - a.reactions)
		.filter(({ onBoard }) => onBoard)
		.map(({ onBoard }) => /** @type {string} */ (onBoard));
	top.splice(5);

	promises.push(
		...top.map(async (onBoard) => {
			const toPin = await CONSTANTS.channels.board?.messages.fetch(onBoard).catch(() => {});
			toPin && (await toPin.pin());
		}),
	);

	promises.push(
		CONSTANTS.channels.board.messages.fetchPinned().then(async (pins) => {
			return (
				pins.size > 5 &&
				(await Promise.all(
					pins.map(async (pin) => !top.includes(pin.id) && (await pin.unpin())),
				))
			);
		}),
	);

	await Promise.all(promises);
}
