import { ChannelType, type Message, type Snowflake } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import { getSettings } from "../settings.js";
import giveXp from "../xp/give-xp.js";
import { BOARD_EMOJI, boardDatabase, boardReactionCount, generateBoardMessage } from "./misc.js";

const processing = new Set<Snowflake>();

/**
 * Update the count on a message on the board.
 *
 * @param message - The board message to update.
 */
export default async function updateBoard({
	count,
	message,
}: {
	count: number;
	message: Message;
}): Promise<void> {
	if (processing.has(message.id)) return;
	processing.add(message.id);
	if (!config.channels.board) throw new ReferenceError("Could not find board channel");
	const reactionThreshold = boardReactionCount(message.channel, message.createdTimestamp);
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
		const sentMessage = await config.channels.board.send({
			...(await generateBoardMessage(message)),
			allowedMentions:
				(await getSettings(message.author)).boardPings ? undefined : { users: [] },
		});

		await giveXp(message.author, sentMessage.url);

		if (config.channels.board.type === ChannelType.GuildAnnouncement)
			await sentMessage.crosspost();

		updateById(
			{ source: message.id, onBoard: sentMessage.id, reactions: count },
			{ channel: message.channel.id, user: message.author.id },
		);
	} else {
		updateById(
			{ source: message.id, reactions: count, onBoard: 0 },
			{ channel: message.channel.id, user: message.author.id },
		);
	}

	const top = boardDatabase.data.toSorted((one, two) => two.reactions - one.reactions);
	top.splice(
		top.findIndex(
			(boarded, index) => index > 8 && boarded.reactions !== top[index + 1]?.reactions,
		) + 1,
	);
	const topIds = await Promise.all(
		top.map(async ({ onBoard }) => {
			const toPin =
				onBoard &&
				(await config.channels.board?.messages.fetch(onBoard).catch(() => void 0));

			if (toPin) await toPin.pin("Is a top-reacted message");

			return onBoard;
		}),
	);
	const pins = await config.channels.board.messages.fetchPinned();
	if (pins.size > topIds.length) {
		for (const [, pin] of pins.filter((pin) => !topIds.includes(pin.id)))
			await pin.unpin("No longer a top-reacted message");
	}

	processing.delete(message.id);
}

function updateById<Keys extends keyof (typeof boardDatabase.data)[number]>(
	newData: (typeof boardDatabase.data)[number]["source"] extends string ?
		Pick<(typeof boardDatabase.data)[number], Keys> & { source: string }
	:	never,
	oldData?: Omit<(typeof boardDatabase.data)[number], Keys | "source">,
): void {
	const data = [...boardDatabase.data];
	const index = data.findIndex((suggestion) => suggestion.source === newData.source);
	const found = data[index];
	if (found) data[index] = { ...found, ...newData };
	else if (oldData)
		data.push({ ...oldData, ...newData } as unknown as (typeof boardDatabase.data)[number]);

	boardDatabase.data = data;
}

export async function syncRandomBoard(): Promise<void> {
	for (const info of boardDatabase.data.toSorted(() => Math.random() - 0.5)) {
		if (info.onBoard) continue;

		const date = Number(BigInt(info.source) >> 22n) + 1_420_070_400_000;

		const reactionsNeeded = boardReactionCount({ id: info.channel }, date);
		if (reactionsNeeded !== undefined && info.reactions < reactionsNeeded) continue;

		const channel = await client.channels.fetch(info.channel).catch(() => void 0);
		if (!channel?.isTextBased()) continue;

		if (reactionsNeeded === undefined && info.reactions < boardReactionCount(channel, date))
			continue;

		const message = await channel.messages.fetch(info.source).catch(() => void 0);
		const reaction = message?.reactions.resolve(BOARD_EMOJI);
		if (message && reaction) {
			await updateBoard({ count: reaction.count, message });
			break;
		}
	}
}
