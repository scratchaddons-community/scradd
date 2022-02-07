import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";
import dotenv from "dotenv";

dotenv.config();
const { MODMAIL_CHANNEL } = process.env;
if (!MODMAIL_CHANNEL) throw new Error("MODMAIL_CHANNEL is not set in the .env.");

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDefaultPermission(false)
		.setDescription(" ")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("close")
				.setDescription("(Mods only) Close a modmail ticket.")
				.addStringOption((input) =>
					input
						.setName("reason")
						.setDescription("Reason for closing the ticket")
						.setRequired(true),
				),
		),

	async interaction(interaction) {
		if (
			interaction.channel?.type !== "GUILD_PUBLIC_THREAD" ||
			interaction.channel.parentId !== MODMAIL_CHANNEL
		) {
			interaction.reply({
				content: `This command can only be used in threads in <#${MODMAIL_CHANNEL}>.`,
				ephemeral: true,
			});
			return;
		}
		const command = interaction.options.getSubcommand();
		if (command === "close") {
			const promises = [];
			promises.push(
				interaction.reply({
					content: `:white_check_mark: Modmail ticket closed!`,
				}),
			);
			const starter = await interaction.channel.fetchStarterMessage();
			const user = await interaction.client.users.fetch(
				interaction.channel?.name.match(/^.+ \((\d+)\)$/i)?.[1] || "",
			);
			if (!user) return;
			const dm = await user.createDM();
			promises.push(
				dm.send({
					embeds: [
						new MessageEmbed()
							.setTitle("Modmail ticket closed!")
							.setDescription(interaction.options.getString("reason") || "")
							.setTimestamp(starter.createdTimestamp)
						.setColor(0x008000),
					],
				}),
			);

			promises.push(
				starter.edit({
					embeds: [
						{
							title: "Modmail ticket closed",
							description: starter.embeds[0]?.description || "",
							color: 0x008000,
						},
					],
				}),
			);
			await Promise.all(promises);
			await interaction.channel.setLocked(true, "Closed by " + interaction.user.tag);
			await interaction.channel.setArchived(true, "Closed by " + interaction.user.tag);
		}
	},
	permissions: [{ id: process.env.MODERATOR_ROLE || "", type: "ROLE", permission: true }],
};

export default info;
