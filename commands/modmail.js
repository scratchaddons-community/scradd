import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import dotenv from "dotenv";
import {
	generateMessage,
	getMemberFromThread,
	getThreadFromMember,
	MODMAIL_CHANNEL,
	WH_NAME,
} from "../common/modmail.js";
import generateHash from "../lib/generateHash.js";

dotenv.config();

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
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("start")
				.setDescription(
					"(Mods only) Start a modmail ticket with a user. If a non-mod wants to start a ticket, please DM me.",
				)
				.addUserOption((input) =>
					input
						.setName("user")
						.setDescription("The user to start a ticket with.")
						.setRequired(true),
				),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand();
		switch (command) {
			case "close": {
				if (
					interaction.channel?.type !== "GUILD_PUBLIC_THREAD" ||
					interaction.channel.parentId !== MODMAIL_CHANNEL ||
					!interaction.guild
				) {
					interaction.reply({
						content: `<:no:940054047854047282> This command can only be used in threads in <#${MODMAIL_CHANNEL}>.`,
						ephemeral: true,
					});
					return;
				}
				const reason = interaction.options.getString("reason") || "";
				/** @type {Promise<any>[]} */
				const promises = [
					interaction.reply({
						content: `<:yes:940054094272430130> Modmail ticket closed! ${reason}`,
					}),
				];
				promises.push(
					getMemberFromThread(interaction.guild, interaction.channel).then(
						async (user) => {
							const dm = await user?.createDM().catch(() => {});
							dm?.send({
								embeds: [
									new MessageEmbed()
										.setTitle("Modmail ticket closed!")
										.setDescription(reason)
										.setTimestamp(interaction.channel?.createdTimestamp)
										.setColor(0x008000),
								],
							});
						},
					),
				);

				promises.push(
					interaction.channel
						.fetchStarterMessage()
						.catch(() => {})
						.then((starter) =>
							starter?.edit({
								embeds: [
									{
										title: "Modmail ticket closed!",
										description: starter.embeds[0]?.description || "",
										color: 0x008000,
									},
								],
							}),
						),
				);
				await Promise.all(promises);
				await interaction.channel.setLocked(true, "Closed by " + interaction.user.tag);
				await interaction.channel.setArchived(true, "Closed by " + interaction.user.tag);
				break;
			}
			case "start": {
				const user = await interaction.guild?.members.fetch(
					interaction.options.getUser("user") || "",
				);
				if (!user || !interaction.guild) {
					interaction.reply({
						content: "<:no:940054047854047282> Could not find user.",
						ephemeral: true,
					});
					return;
				}
				const thread = await getThreadFromMember(interaction.guild, user);
				if (thread)
					return interaction.reply({
						ephemeral: true,
						content: "<:no:940054047854047282> User already has a ticket open.",
					});
				const dm = await user.createDM().catch(() => {
					interaction.reply({
						ephemeral: true,
						content:
							"<:no:940054047854047282> Could not DM user. Ask them to open their DMs.",
					});
				});
				if (!dm) return;
				const mailChannel = await interaction.guild.channels.fetch(MODMAIL_CHANNEL);
				if (!mailChannel) throw new Error("Could not find modmail channel");
				if (mailChannel.type !== "GUILD_TEXT")
					throw new Error("Modmail channel is not a text channel");
				const embed = new MessageEmbed()
					.setTitle("Confimation")
					.setDescription(
						"Are you sure you want to send this message to " +
							user?.user.toString() +
							"?",
					)
					.setColor("BLURPLE")
					.setAuthor({
						name: user.displayName || user.user.username,
						iconURL: user?.avatarURL() || user?.user.avatarURL() || undefined,
					});

				const button = new MessageButton()
					.setLabel("Confirm")
					.setStyle("PRIMARY")
					.setCustomId(generateHash("confirm"));
				const cancelButton = new MessageButton()
					.setLabel("Cancel")
					.setCustomId(generateHash("cancel"))
					.setStyle("SECONDARY");
				await interaction.reply({
					ephemeral: true,
					embeds: [embed],
					components: [new MessageActionRow().addComponents(button, cancelButton)],
					fetchReply: true,
				});

				interaction.channel
					?.createMessageComponentCollector({
						filter: (i) =>
							[button.customId, cancelButton.customId].includes(i.customId) &&
							i.user.id === interaction.user.id,
						time: 15_000,
					})
					.on("collect", async (i) => {
						switch (i.customId) {
							case button.customId: {
								const embed = new MessageEmbed()
									.setTitle("Modmail ticket opened")
									.setDescription(
										"Ticket to " +
											user.toString() +
											" (by " +
											interaction.user.toString() +
											")",
									)
									.setColor("BLURPLE");

								const starterMsg = await mailChannel.send({
									embeds: [embed],
								});
								await starterMsg.startThread({
									name: `${user.user.username} (${user.id})`,
								});
								dm.send({
									embeds: [
										new MessageEmbed()
											.setTitle("Modmail ticket opened")
											.setDescription(
												"The moderation team of " +
													interaction.guild?.name +
													" would like to talk to you.",
											)
											.setColor("BLURPLE"),
									],
								});
								i.reply({
									content: "<:yes:940054094272430130> Modmail ticket opened",
									ephemeral: true,
								});
								button.setDisabled(true);
								break;
							}
							case cancelButton.customId: {
								i.reply({
									content: "<:no:940054047854047282> Modmail canceled",
									ephemeral: true,
								});
								break;
							}
						}
					});
				break;
			}
		}
	},
	permissions: [{ id: process.env.MODERATOR_ROLE || "", type: "ROLE", permission: true }],
};

export default info;
