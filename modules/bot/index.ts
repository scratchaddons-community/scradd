import { defineChatCommand } from "strife.js";

import constants from "../../common/constants.ts";
import info from "./info.ts";

if (constants.env === "production")
	defineChatCommand(
		{
			name: "restart",
			description: "Restart the bot",
			restricted: true,
			access: constants.testingServer,
		},
		async (interaction) => {
			process.emitWarning(`${interaction.user.tag} is restarting the bot`);
			await interaction.reply("Restarting bot…");
			process.exit(1);
		},
	);
else
	defineChatCommand(
		{
			name: "kill",
			description: "Kill the bot",
			restricted: true,
			access: constants.testingServer,
		},
		async (interaction) => {
			process.emitWarning(`${interaction.user.tag} is killing the bot`);
			await interaction.reply("Killing bot…");
			process.exit(1);
		},
	);

defineChatCommand({ name: "info", description: "Show information about me and how I work" }, info);
