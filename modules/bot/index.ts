import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import { cleanDatabaseListeners } from "../../common/database.js";
import {
	defineChatCommand,
	defineButton,
	defineModal,
	defineMenuCommand,
} from "strife.js";
import editMessage, { submitEdit } from "./edit.js";
import getCode, { run } from "./run.js";
import sayCommand, { say } from "./say.js";
import status from "./status.js";
import credits from "./credits.js";
import { syncConfigButton } from "../execute/operations/config.js";

defineMenuCommand(
	{ name: "Edit Message", restricted: true, type: ApplicationCommandType.Message, access: false },
	editMessage,
);
defineModal("edit", submitEdit);

defineChatCommand({ name: "run", description: "Run code on the bot", restricted: true }, getCode);
defineModal("run", run);

if (process.env.NODE_ENV === "production") {
	defineChatCommand(
		{ name: "restart", description: "Restart the bot", restricted: true },
		async (interaction) => {
			await cleanDatabaseListeners();
			await interaction.reply("Restarts bot…");
			process.emitWarning(`${interaction.user.tag} is restarting the bot`);
			process.exit(1);
		},
	);
} else {
	defineChatCommand(
		{ name: "kill", description: "Kill the bot", restricted: true },
		async (interaction) => {
			await cleanDatabaseListeners();
			await interaction.reply("Killing bot…");
			process.emitWarning(`${interaction.user.tag} is killing the bot`);
			process.exit(1);
		},
	);
}

defineChatCommand(
	{
		name: "say",
		description: "Make me send a message",

		options: {
			message: {
				type: ApplicationCommandOptionType.String,
				description: "Message to send",
				maxLength: 2000,
			},
		},

		restricted: true,
		censored: "channel",
		access: false,
	},
	sayCommand,
);
defineMenuCommand(
	{ name: "Send Reply", type: ApplicationCommandType.Message, restricted: true, access: false },
	async (interaction) => {
		await sayCommand(interaction, { reply: interaction.targetMessage.id });
	},
);
defineModal("say", async (interaction, reply) => {
	await say(interaction, interaction.fields.getTextInputValue("message"), reply || undefined);
});

defineChatCommand(
	{
		name: "status",
		description: "See my current status information",

		options: {
			message: {
				type: ApplicationCommandOptionType.String,
				description: "Message to send",
				maxLength: 2000,
			},
		},
		access: true,
	},
	status,
);
defineChatCommand(
	{
		name: "credits",
		description: "List who and what allows me to work",

		options: {
			message: {
				type: ApplicationCommandOptionType.String,
				description: "Message to send",
				maxLength: 2000,
			},
		},
		access: true,
	},
	credits,
);
defineButton("syncConfig", syncConfigButton);
