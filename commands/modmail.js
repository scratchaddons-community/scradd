import { SlashCommandBuilder, EmbedBuilder, GuildMember, ChannelType } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import {
	closeModmail,
	COLORS,
	generateConfirm,
	getThreadFromMember,
	MODMAIL_CHANNEL,
	openModmail,
	sendOpenedMessage,
	UNSUPPORTED,
} from "../common/modmail.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDefaultPermission(false)
		.setDescription("(Mods only) Commands to manage modmail tickets")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("close")
				.setDescription("(Mods only) Close a modmail ticket")
				// The user who closed the ticket will be shown publically -- manually archive the thread if you want to hide your identity")
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
					interaction.channel.parent?.id !== MODMAIL_CHANNEL ||
					!interaction.guild
				) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.no} This command may only be used in threads in <#${MODMAIL_CHANNEL}>.`,
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
								text: "While any future messages will reopen this ticket, it is recommended to create a new one instead by using /modmail start.",
							})
							.setColor(COLORS.closed),
					],
				});

				await closeModmail(interaction.channel, interaction.user, reason ?? "");

				break;
			}
			case "start": {
				const user = interaction.options.getMember("user");

				if (!(user instanceof GuildMember) || !interaction.guild) {
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

				const mailChannel = await interaction.guild.channels.fetch(MODMAIL_CHANNEL);

				if (!mailChannel) throw new ReferenceError("Could not find modmail channel");

				if (mailChannel.type !== ChannelType.GuildText)
					throw new TypeError("Modmail channel is not a text channel");

				await generateConfirm(
					new EmbedBuilder()
						.setTitle("Confirmation")
						.setDescription(
							`Are you sure you want to start a modmail with **${user?.user.toString()}**?`,
						)
						.setColor(COLORS.confirm)
						.setAuthor({ iconURL: user.displayAvatarURL(), name: user.displayName }),
					async (buttonInteraction) => {
						const openedEmbed = new EmbedBuilder()
							.setTitle("Modmail ticket opened!")
							.setDescription(
								`Ticket to ${user.toString()} (by ${interaction.user.toString()})`,
							)
							.setFooter({
								text:
									UNSUPPORTED +
									CONSTANTS.footerSeperator +
									"Messages starting with an equals sign (=) are ignored.",
							})
							.setColor(COLORS.opened);

						await sendOpenedMessage(user).then(async (success) => {
							if (success) {
								const thread = await openModmail(
									mailChannel,
									openedEmbed,
									user.user.username,
								);
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
					(options) => interaction.editReply(options),
				);

				break;
			}
		}
	},

	censored: false,
};

export default info;
