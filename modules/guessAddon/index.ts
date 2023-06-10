import defineCommand from "../../lib/commands.js";
import guessAddon from "./guessAddon.js";
import { checkIfUserPlaying } from "./misc.js";

defineCommand(
	{ name: "guess-addon", description: "Think of an addon and I will guess it!" },
	async (interaction) => {
		if (await checkIfUserPlaying(interaction)) return;
		guessAddon(interaction);
	},
);
