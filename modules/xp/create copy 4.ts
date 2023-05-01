import { MessageType, type Message, type Snowflake } from "discord.js";

import CONSTANTS from "../../common/CONSTANTS.js";
import giveXp, { DEFAULT_XP } from "./xp2.js";

import type Event from "../../common/types/event";

const latestMessages: { [key: Snowflake]: Message[] } = {};

const event: Event<"messageCreate"> = async function event(message) {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage) return;

	if (message.channel.isDMBased() || message.guild?.id !== CONSTANTS.guild.id) return;

	if (process.env.NODE_ENV !== "production" || !message.author.bot || message.interaction) {
		if (!latestMessages[message.channel.id]) {
			const fetched = await message.channel.messages
				.fetch({ limit: 100, before: message.id })
				.then((messages) => messages.toJSON());

			const accumulator: Message<true>[] = [];
			for (
				let index = 0;
				index < fetched.length && accumulator.length < DEFAULT_XP;
				index++
			) {
				const item = fetched[index];
				if (item && (!item.author.bot || item.interaction)) accumulator.push(item);
			}
			latestMessages[message.channel.id] = accumulator;
		}
		const lastInChannel = latestMessages[message.channel.id] ?? [];
		const spam = lastInChannel.findIndex((foundMessage) => {
			return ![message.author.id, message.interaction?.user.id || ""].some((user) =>
				[foundMessage.author.id, foundMessage.interaction?.user.id].includes(user),
			);
		});

		const newChannel = lastInChannel.length < DEFAULT_XP;
		if (!newChannel) lastInChannel.pop();
		lastInChannel.unshift(message);
		const bot = 1 + Number(Boolean(message.interaction));

		await giveXp(
			message.interaction?.user || message.author,
			message.url,
			spam === -1 && !newChannel
				? 1
				: Math.max(
						1,
						Math.round(
							(DEFAULT_XP - (newChannel ? lastInChannel.length - 1 : spam)) /
								bot /
								(1 +
									Number(
										![
											MessageType.Default,
											MessageType.GuildBoost,
											MessageType.GuildBoostTier1,
											MessageType.GuildBoostTier2,
											MessageType.GuildBoostTier3,
											MessageType.Reply,
											MessageType.ChatInputCommand,
											MessageType.ContextMenuCommand,
										].includes(message.type),
									)),
						),
				  ),
		);
	}
};
export default event;
