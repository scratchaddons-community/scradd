import {
	GuildMember,
	time,
	ApplicationCommandOptionType,
	TimestampStyles,
	ButtonStyle,
	ComponentType,
} from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { getStrikeById, strikeDatabase } from "../common/punishments.js";
import { defineCommand } from "../common/types/command.js";
import { paginate } from "../util/discord.js";

const command = defineCommand({
	data: {
		description: "Commands to view strike information",
		subcommands: {
			user: {
				description: "View your or (Mods only) someone else’s strikes",
				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "(Mods only) The user to see strikes for",
					},
				},
			},
			id: {
				description: "View a strike by ID",
				options: {
					id: {
						required: true,
						type: ApplicationCommandOptionType.String,
						description: "The strike's ID",
					},
				},
			},
		},
		censored: false,
	},

	async interaction(interaction) {
		if (!(interaction.member instanceof GuildMember))
			throw new TypeError("interaction.member is not a GuildMember");
		switch (interaction.options.getSubcommand(true)) {
			case "user": {
				const selected = interaction.options.getUser("user") ?? interaction.member;
				if (
					selected.id !== interaction.member.id &&
					CONSTANTS.roles.mod &&
					!interaction.member.roles.resolve(CONSTANTS.roles.mod.id)
				) {
					return await interaction.reply({
						ephemeral: true,
						content: `${CONSTANTS.emojis.statuses.no} You don't have permission to view this member's strikes!`,
					});
				}

				const user = selected instanceof GuildMember ? selected.user : selected;
				const member =
					selected instanceof GuildMember
						? selected
						: await CONSTANTS.guild?.members.fetch(selected.id).catch(() => {});

				if (
					selected.id !== interaction.member.id &&
					CONSTANTS.roles.mod &&
					!interaction.member.roles.resolve(CONSTANTS.roles.mod.id)
				) {
					return await interaction.reply({
						ephemeral: true,
						content: `${CONSTANTS.emojis.statuses.no} You don't have permission to view this member's strikes!`,
					});
				}
				const strikes = strikeDatabase.data
					.filter((strike) => strike.user === selected.id)
					.sort((one, two) => two.date - one.date);

				const totalStrikeCount = Math.trunc(
					strikes.reduce((acc, { count, removed }) => count * +!removed + acc, 0),
				);

				await paginate(
					strikes,
					(strike) =>
						`${strike.removed ? "~~" : ""}\`${strike.id}\`${
							strike.count === 1
								? ""
								: ` (${strike.count === 0.25 ? "verbal" : `\\*${strike.count}`})`
						} - ${time(new Date(strike.date), TimestampStyles.RelativeTime)}${
							strike.removed ? "~~" : ""
						}`,
					(data) => {
						if (
							data.embeds?.[0] &&
							"footer" in data.embeds[0] &&
							data.embeds[0].footer?.text
						) {
							data.embeds[0].footer.text = data.embeds[0].footer?.text.replace(
								/\d+ $/,
								`${totalStrikeCount} strike${totalStrikeCount === 1 ? "" : "s"}`,
							);
						}
						return interaction[interaction.replied ? "editReply" : "reply"](data);
					},
					{
						title: `${member?.displayName || user.username}'s strikes`,
						user: member || user,
						singular: "",
						plural: "",
						failMessage: `${selected.toString()} has never been warned!`,
						formatFromUser: true,
						ephemeral: true,
						count: false,
						generateComponents(filtered) {
							if (filtered.length > 5)
								return [
									{
										type: ComponentType.StringSelect,
										customId: "selectStrike",
										placeholder: "View more information on a strike",
										options: filtered.map((strike) => ({
											label: strike.id,
											value: strike.id,
										})),
									},
								];
							return filtered.map((strike) => ({
								label: strike.id || "",
								style: ButtonStyle.Secondary,
								customId: `${strike.id}_strike`,
								type: ComponentType.Button,
							}));
						},
					},
				);
				break;
			}
			case "id": {
				await interaction.reply(
					await getStrikeById(
						interaction.member,
						interaction.options.getString("id", true),
					),
				);
			}
		}
	},
});
export default command;
