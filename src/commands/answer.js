import { SlashCommandBuilder } from "@discordjs/builders";

/** @type {import("../lib/types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Answer a thread in #suggestions")
		.addStringOption((option) =>
			option
				.setName("answer")
				.setDescription("Answer to the suggestion"),
		),


	async interaction(interaction) {
    console.log(interaction);
  },
};

export default info;
