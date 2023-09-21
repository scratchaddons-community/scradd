import { ChannelType, Message, MessageReaction } from "discord.js";
import config from "../../common/config.js";
import { getSettings } from "../settings.js";
import giveXp from "../xp/giveXp.js";
import { boardDatabase, boardReactionCount, generateBoardMessage } from "./misc.js";

let postingToBoard = false;

/**
 * Update the count on a message on the board.
 *
 * @param message - The board message to update.
 */
export default async function updateBoard(
	reaction: MessageReaction | { count: number; message: Message },
) {
	if (postingToBoard) return;
	postingToBoard = true;
	if (!config.channels.board) throw new ReferenceError("Could not find board channel");
	const { count, message } = reaction;
	const reactionThreshold = boardReactionCount(message.channel, message.createdAt);
	const minReactions = Math.floor(boardReactionCount(message.channel) * 0.9);

	const boardMessageId = boardDatabase.data.find(({ source }) => source === message.id)?.onBoard;

	const boardMessage =
		boardMessageId &&
		(await config.channels.board.messages.fetch(boardMessageId).catch(() => void 0));

	if (boardMessage) {
		if (count < minReactions) {
			await boardMessage.delete();
			updateById({ source: message.id, onBoard: 0, reactions: count });
		} else {
			const content = boardMessage.content.replace(/\d+/, count.toString());
			await boardMessage.edit(content);
			updateById({ source: message.id, reactions: count });
		}
	} else if (count >= reactionThreshold) {
		const fetched = await message.fetch();
		await giveXp(fetched.author, fetched.url);

		const sentMessage = await config.channels.board.send({
			...(await generateBoardMessage(fetched)),
			allowedMentions: getSettings(fetched.author).boardPings ? undefined : { users: [] },
		});

		if (config.channels.board.type === ChannelType.GuildAnnouncement)
			await sentMessage.crosspost();

		updateById(
			{ source: fetched.id, onBoard: sentMessage.id, reactions: count },
			{ channel: fetched.channel.id, user: fetched.author.id },
		);
	} else {
		const fetched = await message.fetch();
		updateById(
			{ source: message.id, reactions: count, onBoard: 0 },
			{ channel: message.channel.id, user: fetched.author.id },
		);
	}

	const top = [...boardDatabase.data].sort((one, two) => two.reactions - one.reactions);
	top.splice(
		top.findIndex(
			(message, index) => index > 8 && message.reactions !== top[index + 1]?.reactions,
		) + 1,
	);
	const topIds = await Promise.all(
		top.map(async ({ onBoard }) => {
			const toPin =
				onBoard &&
				(await config.channels.board?.messages.fetch(onBoard)?.catch(() => void 0));

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

	postingToBoard = false;
}

function updateById<Keys extends keyof typeof boardDatabase.data[number]>(
	newData: typeof boardDatabase.data[number]["source"] extends string
		? Pick<typeof boardDatabase.data[number], Keys> & { source: string }
		: never,
	oldData?: Omit<typeof boardDatabase.data[number], Keys | "source">,
) {
	const data = [...boardDatabase.data];
	const index = data.findIndex((suggestion) => suggestion.source === newData.source);
	const found = data[index];
	if (found) {
		data[index] = { ...found, ...newData };
	} else if (oldData) {
		data.push({ ...oldData, ...newData } as unknown as typeof boardDatabase.data[number]);
	}
	boardDatabase.data = data;
}
