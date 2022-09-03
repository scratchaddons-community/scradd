import { SlashCommandBuilder, EmbedBuilder, GuildMember, PermissionsBitField } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import {
	closeModmail,
	MODMAIL_COLORS,
	generateModmailConfirm,
	getThreadFromMember,
	openModmail,
	sendOpenedMessage,
	MODMAIL_UNSUPPORTED,
} from "../common/modmail.js";

/** @type {import("../types/command").ChatInputCommand} */
export default {
	data: new SlashCommandBuilder()
		.setDefaultMemberPermissions(new PermissionsBitField().toJSON())
		.setDescription("(Mods only) Commands to manage modmail tickets")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("close")
				.setDescription("(Mods only) Close a modmail ticket")
				.addStringOption((input) =>
					input
						.setName("reason")
						.setDescription(
							"Reason for closing the ticket (this will be posted here as well as being sent to the user)",
						)
						.setRequired(false),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("start")
				.setDescription("(Mods only) Start a modmail ticket with a user")
				.addUserOption((input) =>
					input
						.setName("user")
						.setDescription("The user to start a ticket with")
						.setRequired(true),
				),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand(true);

		switch (command) {
			case "close": {
				if (
					!interaction.channel?.isThread() ||
					interaction.channel.parent?.id !== CONSTANTS.channels.modmail?.id
				) {
					await interaction.reply({
						content: `${
							CONSTANTS.emojis.statuses.no
						} This command may only be used in threads in ${CONSTANTS.channels.modmail?.toString()}.`,
						ephemeral: true,
					});

					return;
				}

				const reason = interaction.options.getString("reason") ?? null;

				await interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setTitle("Modmail ticket closed!")
							.setTimestamp(interaction.channel.createdAt)
							.setDescription(reason)
							.setFooter({
								text: "While any future messages will reopen this ticket, it’s recommended to create a new one instead by using /modmail start.",
							})
							.setColor(MODMAIL_COLORS.closed),
					],
				});

				await closeModmail(interaction.channel, interaction.user, reason ?? "");

				break;
			}
			case "start": {
				const user = interaction.options.getMember("user");

				if (!(user instanceof GuildMember)) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.no} Could not find user.`,
						ephemeral: true,
					});

					return;
				}

				const existingThread = await getThreadFromMember(user);

				if (existingThread) {
					await interaction.reply({
						content: `${
							CONSTANTS.emojis.statuses.no
						} User already has a ticket open (${existingThread.toString()}).`,
						ephemeral: true,
					});

					return;
				}

				await generateModmailConfirm(
					new EmbedBuilder()
						.setTitle("Confirmation")
						.setDescription(
							`Are you sure you want to start a modmail with **${user?.user.toString()}**?`,
						)
						.setColor(MODMAIL_COLORS.confirm)
						.setAuthor({ iconURL: user.displayAvatarURL(), name: user.displayName }),
					async (buttonInteraction) => {
						const openedEmbed = new EmbedBuilder()
							.setTitle("Modmail ticket opened!")
							.setDescription(
								`Ticket to ${user.toString()} (by ${interaction.user.toString()})`,
							)
							.setFooter({
								text:
									MODMAIL_UNSUPPORTED +
									CONSTANTS.footerSeperator +
									"Messages starting with an equals sign (=) are ignored.",
							})
							.setColor(MODMAIL_COLORS.opened);

						await sendOpenedMessage(user).then(async (success) => {
							if (success) {
								const thread = await openModmail(openedEmbed, user.user.username);
								await buttonInteraction.reply({
									content: `${
										CONSTANTS.emojis.statuses.yes
									} **Modmail ticket opened!** Send ${user.toString()} a message in ${thread.toString()}.`,
									ephemeral: true,
								});
							} else {
								await buttonInteraction.reply({
									content: `${CONSTANTS.emojis.statuses.no} Could not DM user. Ask them to open their DMs.`,

									ephemeral: true,
								});
							}
						});
					},
					(options) =>
						interaction.reply({ ...options, ephemeral: true, fetchReply: true }),
				);

				break;
			}
		}
	},

	censored: false,
};
