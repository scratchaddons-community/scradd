import { MessageType } from "discord.js";

import automodMessage from "../automod.js";
import CONSTANTS from "../../../common/CONSTANTS.js";

import type Event from "../../../common/types/event";

defineEvent("messageCreate",async (message) => {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage) return;
	if (message.channel.isDMBased() || message.guild?.id !== CONSTANTS.guild.id) return;

	if (await automodMessage(message)) return;
});
