import { BOARD_EMOJI, updateBoard } from "../../../common/board.js";

/** @type {import("../../../types/event").default<"messageReactionRemove">} */
export default async function event(reaction, user) {
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (
		// Ignore other servers
		message.guild?.id !== process.env.GUILD_ID ||
		// Ignore when it’s the wrong emoji
		reaction.emoji.name !== BOARD_EMOJI
	)
		return;

	if (user.partial) user = await user.fetch();

	await updateBoard(message);
}
