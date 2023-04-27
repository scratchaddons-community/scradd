import { MessageType } from "discord.js";

import client from "../../client.js";
import CONSTANTS from "../../common/CONSTANTS.js";

import type Event from "../../common/types/event";
import { remindersDatabase, SpecialReminders } from "./reminders.js";

const event: Event<"messageCreate"> = async function event(message) {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage) return;
	if (message.channel.isDMBased() || message.guild?.id !== CONSTANTS.guild.id) return;


	if (message.interaction?.commandName === "bump" && message.author.id === "302050872383242240") {
		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel: "881619501018394725",
				date: Date.now() + 7260000,
				reminder: undefined,
				id: SpecialReminders.Bump,
				user: client.user.id,
			},
		];
	}
};
export default event;
