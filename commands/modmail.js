import { SlashCommandBuilder } from "@discordjs/builders";
import dotenv from "dotenv";

dotenv.config();
const { MODMAIL_CHANNEL } = process.env;
if (!MODMAIL_CHANNEL) throw new Error("MODMAIL_CHANNEL is not set in the .env.");

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.addSubcommand((subcommand) =>
			subcommand.setName("close").setDescription("(Mods Only) Close a modmail thread."),
		)
		.setDescription("ModMail Commands"),

	async interaction(interaction) {
		if (
			interaction.channel?.type !== "GUILD_PUBLIC_THREAD" ||
			interaction.channel.parentId !== MODMAIL_CHANNEL
		)
			return;
		const command = interaction.options.getSubcommand();
		if (command === "close") {
			await interaction.reply({
				content: `:white_check_mark: ModMail closed!`,
			});
			const starter = await interaction.channel.fetchStarterMessage();
			const user = await interaction.client.users.fetch(starter.embeds[0]?.description || "");
			if (!user) return;
			const dm = await user.createDM();
			dm.send("ModMail closed!");

			await starter.edit({
				embeds: [
					{
						title: "ModMail Ticket Closed",
						description: starter.embeds[0]?.description || "",
						color: 0x00ff00,
					},
				],
			});
			interaction.channel.setArchived(true, "Closed by " + interaction.user.username);
			interaction.channel.setLocked(true, "Closed by " + interaction.user.username);
		}
	},
};

export default info;
