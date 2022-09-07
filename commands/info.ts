import { SlashCommandBuilder, time, Snowflake, ChannelType, EmbedBuilder, Role } from "discord.js";

import { escapeMessage, replaceBackticks } from "../lib/markdown.js";
import { joinWithAnd } from "../lib/text.js";
import CONSTANTS from "../common/CONSTANTS.js";
import pkg from "../package.json" assert { type: "json" };
import type { ChatInputCommand } from "../common/types/command.js";
import client from "../client.js";

/**
 * Get all users with a role.
 *
 * @param roleId - Role to fetch.
 *
 * @returns Users with the role.
 */
async function getRole(roleId: Snowflake): Promise<string> {
	const role = await CONSTANTS.testingServer?.roles.fetch(roleId);
	const members = role?.members.toJSON() ?? [];

	return joinWithAnd(members);
}

const info: ChatInputCommand = {
	data: new SlashCommandBuilder().setDescription("Learn about me").addStringOption((input) => {
		return input
			.setName("type")
			.setDescription("The information to show")
			.setRequired(true)
			.addChoices(
				{ name: "Status", value: "status" },
				{ name: "Configuration", value: "config" },
				{ name: "Credits", value: "credits" },
			);
	}),

	async interaction(interaction) {
		switch (interaction.options.getString("type", true)) {
			case "status": {
				const message = await interaction.reply({ content: "Pinging…", fetchReply: true });

				await interaction.editReply({
					content: "",

					embeds: [
						new EmbedBuilder()
							.setTitle("Status")
							.setDescription(
								`I'm open-source! The source code is available [on GitHub](${pkg.repository.url}).`,
							)
							.addFields(
								{
									name: "Mode",
									value:
										process.env.NODE_ENV === "production"
											? "Production"
											: "Testing",
									inline: true,
								},
								{ name: "Version", value: `v${pkg.version}`, inline: true },
								{
									name: "Last restarted",
									value: time(client.readyAt ?? new Date(), "R"),
									inline: true,
								},
								{
									name: "Ping",
									value:
										Math.abs(
											+message.createdAt - +interaction.createdAt,
										).toLocaleString() + "ms",
									inline: true,
								},
								{
									name: "Heartbeat",
									value: client.ws.ping.toLocaleString() + "ms",
									inline: true,
								},
								{ name: "Node version", value: process.version, inline: true },
							)
							.setThumbnail(client.user.displayAvatarURL())
							.setColor(CONSTANTS.themeColor),
					],
				});
				break;
			}
			case "config": {
				await interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setTitle("Configuration")
							.addFields(
								{
									name: CONSTANTS.zeroWidthSpace,
									value: "**CHANNELS**",
									inline: false,
								},

								...Object.entries(CONSTANTS.channels).map((channel) => {
									return {
										name:
											(channel[0][0] || "").toUpperCase() +
											channel[0].slice(1) +
											" " +
											(channel[1]?.type === ChannelType.GuildVoice
												? "VC"
												: "channel"),
										value: channel[1]?.toString() || "*None*",
										inline: true,
									};
								}),
								{
									name: CONSTANTS.zeroWidthSpace,
									value: "**ROLES**",
									inline: false,
								},
								...Object.entries(CONSTANTS.roles)
									.filter(
										(role): role is [Snowflake, Role] =>
											typeof role[1] === "object",
									)
									.map((role) => {
										return {
											name:
												(role[0][0] || "").toUpperCase() +
												role[0].slice(1) +
												" role",
											value: role[1]?.toString() || "*None*",
											inline: true,
										};
									}),
							)
							.setColor(CONSTANTS.themeColor),
					],
				});
				break;
			}
			case "credits": {
				await interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setTitle("Credits")
							.setDescription("Scradd is hosted on [Railway](https://railway.app/).")
							.setFields(
								{
									name: "Coders",
									value: await getRole(CONSTANTS.roles.developers),
									inline: true,
								},
								{
									name: "Designers",
									value: await getRole(CONSTANTS.roles.designers),
									inline: true,
								},
								{
									name: "Beta testers",
									value: await getRole(CONSTANTS.roles.testers),
									inline: true,
								},
								{
									name: "Third-party code libraries",
									value: joinWithAnd(
										Object.entries(pkg.dependencies),
										([dependency, version]) =>
											`\`${replaceBackticks(
												escapeMessage(dependency + "@" + version),
											)}\``,
									),
									inline: true,
								},
							)
							.setFooter({
								text: "None of the above are in any particular order.",
							})
							.setColor(CONSTANTS.themeColor),
					],
				});
			}
		}
	},
};
export default info;
