import { ButtonStyle, ChannelType, ComponentType, Message } from "discord.js";

import { userSettingsDatabase } from "../commands/settings.js";
import { extractMessageExtremities, getBaseChannel, messageToText } from "../util/discord.js";
import censor from "./language.js";
import CONSTANTS from "./CONSTANTS.js";
import Database from "./database.js";
import giveXp from "./xp.js";

export const BOARD_EMOJI = "🥔";
/**
 * Determines the board reaction count for a channel.
 *
 * @param {import("discord.js").TextBasedChannel} [channel] - The channel to determine reaction count for.
 *
 * @returns {number} - The reaction count.
 */
export function boardReactionCount(channel) {
	const COUNTS = {
		scradd: 2,
		devs: 6,
		misc: 5,
		mods: 4,
		exec: 3,
		admins: 2,
		default: 8,
		info: 10,
	};

	if (process.env.NODE_ENV !== "production") return COUNTS.scradd;

	if (!channel) return COUNTS.default;

	const baseChannel = getBaseChannel(channel);

	if (!baseChannel || baseChannel.isDMBased()) return COUNTS.mods;

	if (baseChannel.isVoiceBased()) return COUNTS.misc;

	if (baseChannel.parent?.id === CONSTANTS.channels.info?.id) return COUNTS.info;

	return (
		{
			[CONSTANTS.channels.mod?.id || ""]: COUNTS.mods,
			[CONSTANTS.channels.modlogs?.id || ""]: COUNTS.mods + 1,
			[CONSTANTS.channels.exec?.id || ""]: COUNTS.exec,
			[CONSTANTS.channels.admin?.id || ""]: COUNTS.admins,
			[CONSTANTS.channels.modmail?.id || ""]: COUNTS.mods,
			"853256939089559583": COUNTS.misc, // #da-boosters
			"869662117651955802": COUNTS.devs, // #devs-only
			[CONSTANTS.channels.old_suggestions?.id || ""]: COUNTS.default,
		}[baseChannel.id] ||
		COUNTS[
			baseChannel.parent?.id === "866028754962612294" // The Cache
				? "misc"
				: "default"
		]
	);
}

if (!CONSTANTS.channels.board) throw new ReferenceError("Could not find board channel");

const { board } = CONSTANTS.channels;

export const boardDatabase = new Database("board");

await boardDatabase.init();

/**
 * Generate an embed and button to represent a board message with.
 *
 * @param {import("./database").Databases["board"] | import("discord.js").Message} info - Info to generate a message from.
 * @param {{ pre?: import("discord.js").APIButtonComponent[]; post?: import("discord.js").APIButtonComponent[] }} [extraButtons] - Extra
 *   custom buttons to show.
 *
 * @returns {Promise<import("discord.js").BaseMessageOptions | undefined>} - The representation of the message.
 */
export async function generateBoardMessage(info, extraButtons = {}) {
	const count =
		info instanceof Message ? info.reactions.resolve(BOARD_EMOJI)?.count || 0 : info.reactions;

	/**
	 * Convert a message to an embed and button representation.
	 *
	 * @param {import("discord.js").Message} message - The message to convert.
	 *
	 * @returns {Promise<import("discord.js").BaseMessageOptions>} - The converted message.
	 */
	async function messageToBoardData(message) {
		const { files, embeds } = extractMessageExtremities(message, censor);

		const description = await messageToText(message);

		const censored = censor(description);
		const censoredName = censor(message.author.username);

		while (embeds.length > 9) embeds.pop(); // 9 and not 10 because we still need to add ours

		return {
			allowedMentions: { users: [] },

			components: [
				{
					type: ComponentType.ActionRow,

					components: [
						...(extraButtons.pre || []),

						{
							label: "View Context",
							style: ButtonStyle.Link,
							type: ComponentType.Button,
							url: message.url,
						},
						...(extraButtons.post || []),
					],
				},
			],

			content: `**${BOARD_EMOJI} ${count}** | ${
				message.channel.isThread() && message.channel.parent
					? `${message.channel.toString()} (${message.channel.parent.toString()})`
					: message.channel.toString()
			} | ${message.author.toString()}`,

			embeds: [
				{
					color: message.member?.displayColor,
					description: censored ? censored.censored : description,

					author: {
						icon_url: (message.member ?? message.author).displayAvatarURL(),

						name:
							message.member?.displayName ??
							(censoredName ? censoredName.censored : message.author.username),
					},

					timestamp: message.createdAt.toISOString(),
				},
				...embeds,
			],

			files,
		};
	}

	if (info instanceof Message) return await messageToBoardData(info);

	const onBoard = info.onBoard && (await board.messages.fetch(info.onBoard).catch(() => {}));

	if (onBoard) {
		const linkButton = onBoard.components?.[0]?.components?.[0];
		const buttons =
			linkButton?.type === ComponentType.Button
				? [...(extraButtons.pre || []), linkButton.toJSON(), ...(extraButtons.post || [])]
				: [...(extraButtons.pre || []), ...(extraButtons.post || [])];

		return {
			allowedMentions: { users: [] },

			components:
				buttons.length > 0 ? [{ type: ComponentType.ActionRow, components: buttons }] : [],

			content: onBoard.content,
			embeds: onBoard.embeds.map((oldEmbed) => oldEmbed.data),
			files: onBoard.attachments.map((attachment) => attachment),
		};
	}

	const channel = await CONSTANTS.guild.channels.fetch(info.channel).catch(() => {});

	if (!channel?.isTextBased()) return;

	const message = await channel.messages.fetch(info.source).catch(() => {});

	if (!message) return;

	return await messageToBoardData(message);
}

/**
 * Update the count on a message on #potatoboard.
 *
 * @param {import("discord.js").Message} message - The board message to update.
 */
export async function updateBoard(message) {
	/** @type {Promise<any>[]} */
	const promises = [];
	const count = message.reactions.resolve(BOARD_EMOJI)?.count || 0;
	const minReactions = boardReactionCount(message.channel);
	const info = boardDatabase.data.find(({ source }) => source === message.id);

	const foundMessage =
		info?.onBoard && (await board.messages.fetch(info.onBoard).catch(() => {}));

	const pings =
		userSettingsDatabase.data.find(({ user }) => user === message.author.id)?.boardPings ??
		process.env.NODE_ENV === "production";

	if (foundMessage) {
		await (count < Math.max(Math.floor(minReactions - minReactions / 6), 0)
			? foundMessage.delete()
			: foundMessage.edit({
					allowedMentions: pings ? undefined : { users: [] },
					content: foundMessage.content.replace(/\d+/, String(count)),
			  }));
	} else if (count >= minReactions) {
		if (!message.author.bot) promises.push(giveXp(message.author, message.url));

		const sentMessage = await board.send({
			...(await generateBoardMessage(message)),
			allowedMentions: pings ? undefined : { users: [] },
		});

		if (board.type === ChannelType.GuildAnnouncement) promises.push(sentMessage.crosspost());

		boardDatabase.data = info
			? boardDatabase.data.map((item) =>
					item.source === message.id
						? { ...item, onBoard: sentMessage.id, reactions: count }
						: item,
			  )
			: [
					...boardDatabase.data,
					{
						reactions: count,
						user: message.author.id,
						channel: message.channel.id,
						source: message.id,
						onBoard: sentMessage.id,
					},
			  ];
	}

	if (foundMessage || count < minReactions) {
		boardDatabase.data = count
			? foundMessage
				? boardDatabase.data.map((item) =>
						item.source === message.id ? { ...item, reactions: count } : item,
				  )
				: [
						...boardDatabase.data,
						{
							channel: message.channel.id,
							onBoard: 0,
							reactions: count,
							source: message.id,
							user: message.author.id,
						},
				  ]
			: boardDatabase.data.filter((item) => item.source !== message.id);
	}

	const top = Array.from(boardDatabase.data.sort((one, two) => two.reactions - one.reactions));

	top.splice(5);
	promises.push(
		Promise.all(
			top.map(async ({ onBoard }) => {
				const toPin = onBoard && (await board.messages.fetch(onBoard)?.catch(() => {}));

				if (toPin) await toPin.pin("Is a top-potatoed message");

				return onBoard;
			}),
		).then(
			async (topIds) =>
				await board?.messages
					.fetchPinned()
					.then(
						async (pins) =>
							pins.size > 5 &&
							(await Promise.all(
								pins.map(
									async (pin) =>
										!topIds.includes(pin.id) &&
										(await pin.unpin("No longer a top-potatoed message")),
								),
							)),
					),
		),
	);

	await Promise.all(promises);
}
