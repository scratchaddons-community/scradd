/** @file Let A user know when their Modmail thread is archived or unarchived. */
import { GuildMember, MessageEmbed } from "discord.js";
import {
	COLORS,
	getMemberFromThread,
	MODMAIL_CHANNEL,
	sendClosedMessage,
	sendOpenedMessage,
	UNSUPPORTED,
} from "../common/modmail.js";

/** @type {import("../types/event").default<"threadUpdate">} */
const event = {
	async event(oldThread, newThread) {
		const latestMessage = (await oldThread.messages.fetch({ limit: 1 })).first();
		if (
			newThread.parent?.id !== MODMAIL_CHANNEL ||
			oldThread.archived === newThread.archived ||
			(newThread.archived &&
				latestMessage?.interaction?.commandName === "modmail" &&
				Date.now() - +latestMessage.createdAt < 60_000)
		)
			return;

		if (newThread.archived) return await sendClosedMessage(newThread);
		const member = await getMemberFromThread(newThread);
		if (!(member instanceof GuildMember)) return;

		await Promise.all([
			newThread.fetchStarterMessage().then((starter) => {
				starter.edit({
					embeds: [
						(starter.embeds[0] ?? new MessageEmbed())
							.setTitle("Modmail ticket opened!")
							.setFooter({
								text: UNSUPPORTED,
							})
							.setColor(COLORS.opened),
					],
				});
			}),
			sendOpenedMessage(member),
		]);
	},
};

export default event;
