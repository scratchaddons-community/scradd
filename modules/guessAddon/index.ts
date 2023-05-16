import defineCommand from "../../lib/commands.js";
import bot from "./bot.js";
import { checkIfUserPlaying } from "./misc.js";
import player from "./player.js";

defineCommand(
	{
		name: "guess-addon",
		description: "Play games where you or I guess addons",

		subcommands: {
			bot: { description: "You think of an addon and I guess" },
			player: { description: "I think of an addon and you guess" },
		},
	},
	async (interaction) => {
		if (await checkIfUserPlaying(interaction)) return;
		const command = interaction.options.getSubcommand(true);

		if (command === "bot") bot(interaction);
		else player(interaction);
	},
);
