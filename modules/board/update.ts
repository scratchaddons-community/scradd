import { ChannelType, Message } from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { getSettings } from "../settings.js";
import giveXp from "../xp/giveXp.js";
import { boardDatabase, boardReactionCount, BOARD_EMOJI, generateBoardMessage } from "./misc.js";

/**
 * Update the count on a message on the board.
 *
 * @param message - The board message to update.
 */
export default async function updateBoard(message: Message) {
	if (!config.channels.board) throw new ReferenceError("Could not find board channel");
	const count = message.reactions.resolve(BOARD_EMOJI)?.count ?? 0;
	const minReactions = boardReactionCount(message.channel);

	const boardMessageId = boardDatabase.data.find(({ source }) => source === message.id)?.onBoard;

	const boardMessage = boardMessageId
		? await config.channels.board.messages.fetch(boardMessageId).catch(() => {})
		: undefined;

	if (boardMessage) {
		if (count < Math.floor(minReactions * 0.8)) {
			await boardMessage.delete();
		} else {
			const content = boardMessage.content.replace(/\d+/, String(count));
			await boardMessage.edit(content);
		}
	} else if (count >= minReactions) {
		if (!message.author.bot) await giveXp(message.author, message.url);

		const sentMessage = await config.channels.board.send({
			...(await generateBoardMessage(message)),
			allowedMentions: getSettings(message.author).boardPings ? undefined : { users: [] },
		});

		if (config.channels.board.type === ChannelType.GuildAnnouncement)
			await sentMessage.crosspost();

		boardDatabase.data = [
			...boardDatabase.data.filter((item) => item.source !== message.id),
			...(count
				? ([
						{
							channel: message.channel.id,
							onBoard: sentMessage.id,
							reactions: count,
							source: message.id,
							user: message.author.id,
						},
				  ] as const)
				: []),
		];
	}

	if (boardMessage || count < minReactions) {
		boardDatabase.data = [
			...boardDatabase.data.filter((item) => item.source !== message.id),
			...(count
				? ([
						{
							channel: message.channel.id,
							onBoard: boardMessage?.id ?? 0,
							reactions: count,
							source: message.id,
							user: message.author.id,
						},
				  ] as const)
				: []),
		];
	}

	const top = Array.from(boardDatabase.data).sort((one, two) => two.reactions - one.reactions);
	top.splice(
		top.findIndex(
			(message, index) => index > 8 && message.reactions !== top[index + 1]?.reactions,
		) + 1,
	);
	const topIds = await Promise.all(
		top.map(async ({ onBoard }) => {
			const toPin =
				onBoard && (await config.channels.board?.messages.fetch(onBoard)?.catch(() => {}));

			if (toPin) await toPin.pin("Is a top-reacted message");

			return onBoard;
		}),
	);
	const pins = await config.channels.board.messages.fetchPinned();
	if (pins.size > top.length) {
		await Promise.all(
			pins
				.filter((pin) => !topIds.includes(pin.id))
				.map(async (pin) => await pin.unpin("No longer a top-reacted message")),
		);
	}
}
