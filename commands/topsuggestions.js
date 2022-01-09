import { SlashCommandBuilder } from "@discordjs/builders";
import { SUGGESTION_CHANNEL } from "../common/suggest.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder().setDescription("Gets the top suggestions from #suggestions!"),
	async interaction(interaction) {
		if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env");
		const channel = await interaction.guild?.channels.fetch(SUGGESTION_CHANNEL);
		if (!channel?.isText()) return;
		const messages = await channel.messages.fetch({
			limit: 100,
			// after: 0,
		});
		console.log(messages.first());
	},
};

export default info;
