import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { defineButton, defineChatCommand, defineMenuCommand, defineModal } from "strife.js";



import config from "../../common/config.ts";
import constants from "../../common/constants.ts";
import { prepareExit } from "../../common/database.ts";
import features from "../../common/features.ts";
import { syncConfigButton } from "../execute/operations/config.ts";
import credits from "./credits.ts";
import editMessage, { submitEdit } from "./edit.ts";
import getCode, { run } from "./run.ts";
import sayCommand, { say } from "./say.ts";
import status from "./status.ts";


defineMenuCommand(
	{ name: "Edit Message", restricted: true, type: ApplicationCommandType.Message, access: false },
	editMessage,
);
defineModal("edit", submitEdit);

const access = features.botRunTestingServer ? ["@defaults", config.guilds.testing.id] : undefined;

defineChatCommand(
	{ name: "run", description: "Run code on the bot", restricted: true, access },
	getCode,
);
defineModal("run", run);

if (constants.env === "production") {
	defineChatCommand(
		{ name: "restart", description: "Restart the bot", restricted: true, access },
		async (interaction) => {
			process.emitWarning(`${interaction.user.tag} is restarting the bot`);
			await interaction.reply("Restarting bot…");
			await prepareExit();
			process.exit(1);
		},
	);
} else {
	defineChatCommand(
		{ name: "kill", description: "Kill the bot", restricted: true, access },
		async (interaction) => {
			process.emitWarning(`${interaction.user.tag} is killing the bot`);
			await interaction.reply("Killing bot…");
			await prepareExit();
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
	{ name: "status", description: "See my current status information", access: true },
	status,
);
defineChatCommand(
	{ name: "credits", description: "List who and what allows me to work", access: true },
	credits,
);
defineButton("syncConfig", syncConfigButton);
