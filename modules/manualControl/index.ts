import { ApplicationCommandType, ApplicationCommandOptionType, User } from "discord.js";
import client from "../../client.js";
import defineCommand from "../../commands.js";
import { cleanDatabaseListeners } from "../../common/database.js";
import { defineModal } from "../../components.js";
import editMessage, { submitEdit } from "./edit.js";
import getCode, { run } from "./run.js";
import sayCommand, { say } from "./say.js";

defineCommand(
	{
		name: "Edit Message",
		restricted: true,
		type: ApplicationCommandType.Message,
	},
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
					? owner.username
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
		description: "(Mods only) Send a message",

		options: {
			message: {
				type: ApplicationCommandOptionType.String,
				description: "Message content",
				maxLength: 2000,
			},
		},

		restricted: true,
		censored: "channel",
	},

	sayCommand,
);
defineModal("say", async (interaction) => {
	await say(interaction, interaction.fields.getTextInputValue("message"));
});
