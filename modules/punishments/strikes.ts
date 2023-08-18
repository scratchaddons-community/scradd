import {
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
	GuildMember,
	time,
	TimestampStyles,
	User,
	type RepliableInteraction,
} from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { paginate } from "../../util/discord.js";
import { getSettings } from "../settings.js";
import filterToStrike, { PARTIAL_STRIKE_COUNT, strikeDatabase } from "./misc.js";

export async function getStrikes(
	selected: GuildMember | User,
	interaction: ChatInputCommandInteraction<"cached" | "raw"> | ButtonInteraction,
) {
	if (
		selected.id !== interaction.user.id &&
		!(
			config.roles.mod &&
			(interaction.member instanceof GuildMember
				? interaction.member.roles.resolve(config.roles.mod.id)
				: interaction.member?.roles.includes(config.roles.mod.id))
		)
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to view this member’s strikes!`,
		});
	}

	const user = selected instanceof GuildMember ? selected.user : selected;
	const member =
		selected instanceof GuildMember
			? selected
			: await config.guild.members.fetch(selected.id).catch(() => user);

	const strikes = strikeDatabase.data
		.filter((strike) => strike.user === selected.id)
		.sort((one, two) => two.date - one.date);

	const totalStrikeCount = Math.trunc(
		strikes.reduce(
			(accumulator, { count, removed }) => count * Number(!removed) + accumulator,
			0,
		),
	);

	await paginate(
		strikes,
		(strike) =>
			`${strike.removed ? "~~" : ""}\`${strike.id}\`${
				strike.count === 1
					? ""
					: ` (${
							strike.count === PARTIAL_STRIKE_COUNT ? "verbal" : `\\*${strike.count}`
					  })`
			} - ${time(new Date(strike.date), TimestampStyles.RelativeTime)}${
				strike.removed ? "~~" : ""
			}`,
		(data) => interaction.reply({ ...data, ephemeral: true }),
		{
			title: `${member.displayName}’s strikes`,
			format: member,
			singular: "strike",
			failMessage: `${selected.toString()} has never been warned!`,

			user: interaction.user,
			totalCount: totalStrikeCount,

			generateComponents(filtered) {
				if (filtered.length > 5) {
					return [
						{
							type: ComponentType.StringSelect,
							customId: "_selectStrike",
							placeholder: "View more information on a strike",

							options: filtered.map((strike) => ({
								label: strike.id.toString(),
								value: strike.id.toString(),
							})),
						},
					];
				}
				return filtered.map((strike) => ({
					label: strike.id.toString(),
					style: ButtonStyle.Secondary,
					customId: `${strike.id}_strike`,
					type: ComponentType.Button,
				}));
			},
			customComponentLocation: "above",
		},
	);
}

export async function getStrikeById(interaction: RepliableInteraction, filter: string) {
	if (!(interaction.member instanceof GuildMember))
		throw new TypeError("interaction.member is not a GuildMember");

	await interaction.deferReply({ ephemeral: true });

	const strike = await filterToStrike(filter);
	if (!strike)
		return await interaction.editReply(`${constants.emojis.statuses.no} Invalid strike ID!`);

	const isModerator = config.roles.mod && interaction.member.roles.resolve(config.roles.mod.id);
	if (strike.user !== interaction.member.id && !isModerator) {
		return await interaction.editReply(
			`${constants.emojis.statuses.no} You don’t have permission to view this member’s strikes!`,
		);
	}

	const member = await config.guild.members.fetch(strike.user).catch((): undefined => {});
	const user = member?.user || (await client.users.fetch(strike.user).catch(() => {}));

	const moderator =
		isModerator && strike.mod === "AutoMod"
			? strike.mod
			: strike.mod && (await client.users.fetch(strike.mod).catch(() => {}));
	const nick = (member ?? user)?.displayName;
	const { useMentions } = getSettings(interaction.member.user);
	return await interaction.editReply({
		components: isModerator
			? [
					{
						type: ComponentType.ActionRow,

						components: [
							strike.removed
								? {
										type: ComponentType.Button,
										customId: `${strike.id}_addStrikeBack`,
										label: "Add back",
										style: ButtonStyle.Primary,
								  }
								: {
										type: ComponentType.Button,
										customId: `${strike.id}_removeStrike`,
										label: "Remove",
										style: ButtonStyle.Danger,
								  },
						],
					},
			  ]
			: [],

		embeds: [
			{
				color: member?.displayColor,

				author: nick
					? { icon_url: (member || user)?.displayAvatarURL(), name: nick }
					: undefined,

				title: `${strike.removed ? "~~" : ""}Strike \`${strike.id}\`${
					strike.removed ? "~~" : ""
				}`,

				description: strike.reason,
				timestamp: new Date(strike.date).toISOString(),

				fields: [
					{ name: "⚠️ Count", value: strike.count.toString(), inline: true },
					...(moderator
						? [
								{
									name: "🛡 Moderator",
									value:
										typeof moderator === "string"
											? moderator
											: useMentions
											? moderator.toString()
											: moderator.displayName,
									inline: true,
								},
						  ]
						: []),
					...(user
						? [
								{
									name: "👤 Target user",
									value: useMentions ? user.toString() : user.displayName,
									inline: true,
								},
						  ]
						: []),
				],
			},
		],
	});
}
