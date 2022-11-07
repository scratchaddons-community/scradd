import { time, Snowflake, Role } from "discord.js";

import { escapeMessage } from "../util/markdown.js";
import { joinWithAnd } from "../util/text.js";
import CONSTANTS from "../common/CONSTANTS.js";
import pkg from "../package.json" assert { type: "json" };
import { defineCommand } from "../common/types/command.js";
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

const command = defineCommand({
	data: {
		description: "Learn about me",
		subcommands: {
			credits: { description: "Show bot status" },
			config: { description: "Show configuration settings" },
			status: { description: "Show credit information" },
		},
	},

	async interaction(interaction) {
		switch (interaction.options.getSubcommand(true)) {
			case "status": {
				const message = await interaction.reply({ content: "Pinging…", fetchReply: true });

				await interaction.editReply({
					content: "",

					embeds: [
						{
							title: "Status",
							description: `I'm open-source! The source code is available [on GitHub](${pkg.repository.url}).`,
							fields: [
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
									name: "WebSocket latency",
									value: client.ws.ping.toLocaleString() + "ms",
									inline: true,
								},
								{ name: "Node version", value: process.version, inline: true },
							],
							thumbnail: { url: client.user.displayAvatarURL() },
							color: CONSTANTS.themeColor,
						},
					],
				});
				break;
			}
			case "config": {
				await interaction.reply({
					embeds: [
						{
							title: "Configuration",
							fields: [
								{
									name: CONSTANTS.zeroWidthSpace,
									value: "**CHANNELS**",
									inline: false,
								},

								...Object.entries(CONSTANTS.channels).map((channel) => {
									return {
										name:
											channel[0]
												.split("_")
												.map(
													(name) =>
														(name[0] || "").toUpperCase() +
														name.slice(1),
												)
												.join(" ") + " channel",
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
										(role): role is [string, Role | undefined] =>
											typeof role[1] !== "string",
									)
									.map((role) => {
										return {
											name:
												role[0]
													.split("_")
													.map(
														(name) =>
															(name[0] || "").toUpperCase() +
															name.slice(1),
													)
													.join(" ") + " role",
											value: role[1]?.toString() || "*None*",
											inline: true,
										};
									}),
							],
							color: CONSTANTS.themeColor,
						},
					],
				});
				break;
			}
			case "credits": {
				await interaction.reply({
					embeds: [
						{
							title: "Credits",
							description: "Scradd is hosted on [Railway](https://railway.app/).",
							fields: [
								{
									name: "Developers",
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
											`\`${escapeMessage(dependency + "@" + version)}\``,
									),
									inline: true,
								},
							],
							footer: {
								text: "None of the above users are in any particular order.",
							},
							color: CONSTANTS.themeColor,
						},
					],
				});
			}
		}
	},
});
export default command;
