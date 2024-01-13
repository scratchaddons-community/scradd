import { ApplicationCommandType, ApplicationCommandOptionType, User } from "discord.js";
import { cleanDatabaseListeners } from "../../common/database.js";
import {
	client,
	defineChatCommand,
	defineButton,
	defineModal,
	defineMenuCommand,
	defineSubcommands,
} from "strife.js";
import editMessage, { submitEdit } from "./edit.js";
import getCode, { run } from "./run.js";
import sayCommand, { say } from "./say.js";
import info, { syncConfigButton } from "./info.js";

defineMenuCommand(
	{ name: "Edit Message", restricted: true, type: ApplicationCommandType.Message, access: false },
	editMessage,
);
defineModal("edit", submitEdit);

const { owner } = await client.application.fetch();
defineChatCommand(
	{
		name: "run",
		description: `(${
			process.env.NODE_ENV === "production"
				? owner instanceof User
					? owner.displayName
					: owner?.name + " team"
				: "Scradd dev"
		} only) Run code on Scradd`,

		restricted: true,
	},
	getCode,
);
defineModal("run", run);

if (process.env.NODE_ENV === "production") {
	defineChatCommand(
		{ name: "restart", description: "(Admin only) Restarts the bot", restricted: true },
		async (interaction) => {
			await cleanDatabaseListeners();
			await interaction.reply("Restarts bot…");
			process.emitWarning(`${interaction.user.tag} is restarting the bot`);
			process.exit(1);
		},
	);
} else {
	defineChatCommand(
		{ name: "kill", description: "(Scradd dev only) Kills the bot", restricted: true },
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
		description: "(Mod only) Send a message",

		options: {
			message: {
				type: ApplicationCommandOptionType.String,
				description: "Message content (send ‘-’ to open a multi-line input)",
				maxLength: 2000,
				required: true,
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
		await sayCommand(interaction, { message: "-", reply: interaction.targetMessage.id });
	},
);
defineModal("say", async (interaction, reply) => {
	await say(interaction, interaction.fields.getTextInputValue("message"), reply || undefined);
}); 

defineSubcommands(
	{
		name: "info",
		description: "Learn about me",
		access: true,

		subcommands: {
			status: { description: "Show bot status", options: {} },
			credits: { description: "Show credit information", options: {} },
			config: { description: "Show configuration settings", options: {} },
			emojis: { description: "Show all stored emojis", options: {} },
		},
	},
	info,
);
defineButton("syncConfig", syncConfigButton);
