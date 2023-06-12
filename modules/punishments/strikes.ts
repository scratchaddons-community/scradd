import {
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
	GuildMember,
	type InteractionReplyOptions,
	time,
	TimestampStyles,
	User,
} from "discord.js";
import { client } from "../../lib/client.js";
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
			: await config.guild.members.fetch(selected.id).catch(() => {});

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
		async (data) => {
			const newData = { ...data };
			if (
				newData.embeds?.[0] &&
				"footer" in newData.embeds[0] &&
				newData.embeds[0].footer?.text
			) {
				newData.embeds[0].footer.text = newData.embeds[0].footer.text.replace(
					/\d+ $/,
					`${totalStrikeCount} strike${totalStrikeCount === 1 ? "" : "s"}`,
				);
			}
			return await (interaction.replied
				? interaction.editReply(newData)
				: interaction.reply(newData));
		},
		{
			title: `${(member ?? user).displayName}’s strikes`,
			singular: "",
			plural: "",
			failMessage: `${selected.toString()} has never been warned!`,
			format: member || user,
			ephemeral: true,
			showIndexes: false,
			user: interaction.user,

			generateComponents(filtered) {
				if (filtered.length > 5) {
					return [
						{
							type: ComponentType.StringSelect,
							customId: "_selectStrike",
							placeholder: "View more information on a strike",

							options: filtered.map((strike) => ({
								label: String(strike.id),
								value: String(strike.id),
							})),
						},
					];
				}
				return filtered.map((strike) => ({
					label: String(strike.id),
					style: ButtonStyle.Secondary,
					customId: `${strike.id}_strike`,
					type: ComponentType.Button,
				}));
			},
			customComponentLocation: "above",
		},
	);
}

/**
 * Reply to a interaction with strike information.
 *
 * @param interactor - The user who initiated the interaction.
 * @param filter - The strike to get.
 */
export async function getStrikeById(
	interactor: GuildMember,
	filter: string,
): Promise<InteractionReplyOptions> {
	const strike = await filterToStrike(filter);
	if (!strike)
		return { ephemeral: true, content: `${constants.emojis.statuses.no} Invalid strike ID!` };

	const isModerator = config.roles.mod && interactor.roles.resolve(config.roles.mod.id);
	if (strike.user !== interactor.id && !isModerator) {
		return {
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to view this member’s strikes!`,
		};
	}

	const member = await config.guild.members.fetch(strike.user).catch(() => {});
	const user = member?.user || (await client.users.fetch(strike.user).catch(() => {}));

	const moderator =
		isModerator && strike.mod === "AutoMod"
			? strike.mod
			: strike.mod && (await client.users.fetch(strike.mod).catch(() => {}));
	const nick = (member ?? user)?.displayName;
	const { useMentions } = getSettings(interactor.user);
	return {
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

		ephemeral: true,

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
					{ name: "⚠️ Count", value: String(strike.count), inline: true },
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
	};
}
