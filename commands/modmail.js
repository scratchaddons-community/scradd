import { SlashCommandBuilder } from "@discordjs/builders";
import dotenv from "dotenv";

dotenv.config();
const { MODMAIL_CHANNEL } = process.env;
if (!MODMAIL_CHANNEL) throw new Error("MODMAIL_CHANNEL is not set in the .env.");

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
	.setDescription(" ")
		.addSubcommand((subcommand) =>
			subcommand.setName("close").setDescription("(Mods only) Close a modmail ticket."),
		),

	async interaction(interaction) {
		if (
			interaction.channel?.type !== "GUILD_PUBLIC_THREAD" ||
			interaction.channel.parentId !== MODMAIL_CHANNEL
		)
			return;
		const command = interaction.options.getSubcommand();
		if (command === "close") {
			await interaction.reply({
				content: `:white_check_mark: Modmail ticket closed!`,
			});
			const starter = await interaction.channel.fetchStarterMessage();
			const user = await interaction.client.users.fetch(
				interaction.channel?.name.match(/^.+ \((\d+)\)$/i)?.[1] || "",
			);
			if (!user) return;
			const dm = await user.createDM();
			dm.send({content: "Modmail ticket closed!"});

			await starter.edit({
				embeds: [
					{
						title: "Modmail ticket closed",
						description: starter.embeds[0]?.description || "",
						color: 0x00ff00,
					},
				],
			});
			interaction.channel.setLocked(true, "Closed by " + interaction.user.tag);
			interaction.channel.setArchived(true, "Closed by " + interaction.user.tag);
		}
	},
};

export default info;
