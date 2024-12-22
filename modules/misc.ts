import { MessageType } from "discord.js";
import { defineEvent } from "strife.js";

defineEvent.pre(
	"messageCreate",
	(message) =>
		!(message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage),
);
defineEvent.pre("threadCreate", (_, newlyCreated) => newlyCreated);
