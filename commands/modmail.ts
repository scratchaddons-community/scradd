import { ApplicationCommandOptionType, GuildMember } from "discord.js";

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
import { defineCommand } from "../common/types/command.js";
import { disableComponents } from "../util/discord.js";

const command = defineCommand({
	data: {
		description: "(Mods only) Commands to manage modmail tickets",
		restricted: true,

		subcommands: {
			close: {
				description: "(Mods only) Close a modmail ticket",

				options: {
					reason: {
						type: ApplicationCommandOptionType.String,

						description:
							"Reason for closing the ticket (this will be posted here as well as being sent to the user)",
					},
				},
			},

			start: {
				description: "(Mods only) Start a modmail ticket with a user",

				options: {
					user: {
						required: true,
						type: ApplicationCommandOptionType.User,
						description: "The user to start a ticket with",
					},
				},
			},
		},

		censored: false,
	},

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
						{
							color: MODMAIL_COLORS.closed,
							title: "Modmail ticket closed!",
							timestamp: interaction.channel.createdAt?.toISOString() ?? undefined,
							description: reason ?? undefined,

							footer: {
								text: "While any future messages will reopen this ticket, it’s recommended to create a new one instead by using /modmail start.",
							},
						},
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

				const collector = await generateModmailConfirm(
					{
						title: "Confirmation",
						description: `Are you sure you want to start a modmail with **${user.toString()}**?`,
						color: MODMAIL_COLORS.confirm,
						author: { icon_url: user.displayAvatarURL(), name: user.displayName },
					},
					async (buttonInteraction) => {
						await sendOpenedMessage(user).then(async (success) => {
							if (success) {
								const thread = await openModmail(
									{
										title: "Modmail ticket opened!",
										description: `Ticket to ${user.toString()} (by ${interaction.user.toString()})`,

										footer: {
											text: `${MODMAIL_UNSUPPORTED}\nMessages starting with an equals sign (=) are ignored.`,
										},

										color: MODMAIL_COLORS.opened,
									},
									user,
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
					async (options) =>
						await interaction.reply({ ...options, ephemeral: true, fetchReply: true }),
				);
				collector.on("end", async () => {
					const message = await interaction.fetchReply();
					await interaction.editReply({
						components: disableComponents(message.components),
					});
				});

				break;
			}
		}
	},
});
export default command;
