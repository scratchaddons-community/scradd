import { ApplicationCommandType, ApplicationCommandOptionType, User } from "discord.js";
import { cleanDatabaseListeners } from "../../common/database.js";
import { client, defineCommand, defineButton, defineModal } from "strife.js";
import editMessage, { submitEdit } from "./edit.js";
import getCode, { run } from "./run.js";
import sayCommand, { say, sayAutocomplete } from "./say.js";
import info, { syncConfigButton } from "./info.js";

defineCommand(
	{ name: "Edit Message", restricted: true, type: ApplicationCommandType.Message },
	editMessage,
);
defineModal("edit", submitEdit);

const { owner } = await client.application.fetch();
defineCommand(
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

defineCommand(
	{
		name: "kill",
		description: `(${process.env.NODE_ENV === "production" ? "Admin" : "Scradd dev"} only) ${
			process.env.NODE_ENV === "production" ? "Restarts" : "Kills"
		} the bot`,

		restricted: true,
	},

	async (interaction) => {
		await cleanDatabaseListeners();
		await interaction.reply("Killing bot…");
		process.emitWarning(`${interaction.user.tag} is killing the bot`);
		// eslint-disable-next-line unicorn/no-process-exit -- This is how you restart the process on Railway.
		process.exit(1);
	},
);

defineCommand(
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
			reply: {
				type: ApplicationCommandOptionType.String,
				description: "The ID of a message to reply to",
				minLength: 17,
				autocomplete: sayAutocomplete,
			},
		},

		restricted: true,
		censored: "channel",
	},

	sayCommand,
);
defineModal("say", async (interaction, reply) => {
	await say(interaction, interaction.fields.getTextInputValue("message"), reply || undefined);
});

defineCommand(
	{
		name: "info",
		description: "Learn about me",

		subcommands: {
			status: { description: "Show bot status" },
			credits: { description: "Show credit information" },
			config: { description: "Show configuration settings" },
		},
	},
	info,
);
defineButton("syncConfig", syncConfigButton);
