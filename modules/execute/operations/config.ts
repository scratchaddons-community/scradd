import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ChannelType,
	ComponentType,
	GuildMember,
	type APIEmbed,
	type ButtonInteraction,
	type Snowflake,
} from "discord.js";
import config, { syncConfig } from "../../../common/config.js";
import constants from "../../../common/constants.js";
import autoreactions, { dadEasterEggCount } from "../../autos/autos-data.js";
import log, { LogSeverity, LoggingEmojis } from "../../logging/misc.js";
import type { CustomOperation } from "../util.js";

const data: CustomOperation = {
	name: "config",
	description: "View and (admins only) update my configuration",
	options: [
		{
			name: "dynamic",
			description:
				"View and (admins only) update channels and roles used for special behavior",
			type: ApplicationCommandOptionType.Subcommand,
		},
		{
			name: "static",
			description: "View custom emojis used in responses and information about secrets",

			type: ApplicationCommandOptionType.Subcommand,
		},
	],
	async command(interaction, { subcommand }) {
		switch (subcommand) {
			case "dynamic": {
				const isStaff =
					interaction.member instanceof GuildMember ?
						interaction.member.roles.resolve(config.roles.staff.id)
					:	interaction.member.roles.includes(config.roles.staff.id);
				await interaction.reply({
					embeds: getDynamicConfig(),

					components:
						isStaff ?
							[
								{
									type: ComponentType.ActionRow,
									components: [
										{
											style: ButtonStyle.Primary,
											type: ComponentType.Button,
											label: "Sync",
											customId: "_syncConfig",
										},
									],
								},
							]
						:	[],
				});
				break;
			}
			case "static": {
				await interaction.reply({
					content: `There are currently **${dadEasterEggCount}** custom dad responses and **${autoreactions.length}** autoreactions.\nSome have multiple triggers, which are not counted here.`,
					embeds: [
						{
							title: "Emojis",
							color: constants.themeColor,
							fields: Object.entries(constants.emojis)
								.map(([group, emojis]) => [group, Object.entries(emojis)] as const)
								.toSorted(([, one], [, two]) => one.length - two.length)
								.map(([group, emojis]) => ({
									name: group,
									inline: true,
									value: emojis
										.map(([name, emoji]) => `${emoji} (${name})`)
										.join("\n"),
								})),
						},
					],
				});
				break;
			}
			default: {
				break;
			}
		}
	},
};

export default data;

function getDynamicConfig(): APIEmbed[] {
	return [
		{
			title: "Channels",
			color: constants.themeColor,

			fields: Object.entries(config.channels)
				.filter(
					(
						channel,
					): channel is [(typeof channel)[0], Exclude<(typeof channel)[1], Snowflake>] =>
						typeof channel[1] !== "string",
				)
				.map((channel) => ({
					name: `${channel[0].replaceAll(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()} ${
						channel[1]?.type === ChannelType.GuildCategory ? "category" : "channel"
					}`,

					value: channel[1]?.toString() ?? "*None*",
					inline: true,
				})),
		},
		{
			title: "Roles",
			color: constants.themeColor,

			fields: [...Object.entries(config.roles)].map((role) => ({
				name: `${role[1]?.unicodeEmoji ? role[1].unicodeEmoji + " " : ""}${role[0]
					.replaceAll(/([a-z])([A-Z])/g, "$1 $2")
					.toLowerCase()} role`,

				value: role[1]?.toString() ?? "*None*",
				inline: true,
			})),
		},
	];
}

export async function syncConfigButton(interaction: ButtonInteraction): Promise<void> {
	if (
		interaction.member instanceof GuildMember ?
			interaction.member.roles.resolve(config.roles.staff.id)
		:	interaction.member?.roles.includes(config.roles.staff.id)
	) {
		await syncConfig();
		await interaction.message.edit({ embeds: getDynamicConfig() });
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.yes} Synced configuration!`,
		});
		await log(
			`${LoggingEmojis.ServerUpdate} Configuration synced by ${interaction.user.toString()}`,
			LogSeverity.ImportantUpdate,
		);
	} else
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to sync my configuration!`,
		});
}
