import { GuildMember, MessageEmbed } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
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
		if (newThread.guild.id !== process.env.GUILD_ID) return;

		const latestMessage = (await oldThread.messages.fetch({ limit: 1 })).first();
		if (
			newThread.parent?.id !== MODMAIL_CHANNEL ||
			oldThread.archived === newThread.archived ||
			(newThread.archived &&
				latestMessage?.interaction?.commandName === "modmail close" &&
				Date.now() - +latestMessage.createdAt < 60_000)
		)
			return;

		if (newThread.archived) {
			await sendClosedMessage(newThread);
			return;
		}
		const member = await getMemberFromThread(newThread);
		if (!(member instanceof GuildMember)) return;

		await Promise.all([
			newThread.fetchStarterMessage().then((starter) => {
				starter
					.edit({
						embeds: [
							new MessageEmbed(starter.embeds[0])
								.setTitle("Modmail ticket opened!")
								.setFooter({
									text:
										UNSUPPORTED +
										CONSTANTS.footerSeperator +
										"Messages starting with an equals sign (=) are ignored.",
								})
								.setColor(COLORS.opened),
						],
					})
					.catch(console.error);
			}),
			sendOpenedMessage(member),
		]);
	},
};

export default event;
