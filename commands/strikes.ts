import {
	GuildMember,
	time,
	InteractionReplyOptions,
	ApplicationCommandOptionType,
	TimestampStyles,
	ButtonStyle,
	ComponentType,
} from "discord.js";
import client from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { filterToStrike, strikeDatabase } from "../common/warn.js";
import { defineCommand } from "../common/types/command.js";
import { userSettingsDatabase } from "./settings.js";
import { GlobalUsersPattern, paginate } from "../util/discord.js";

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

export async function getStrikeById(
	interactor: GuildMember,
	filter: string,
): Promise<InteractionReplyOptions> {
	const { strike, message } = (await filterToStrike(filter)) ?? {};
	if (!strike || !message)
		return { ephemeral: true, content: `${CONSTANTS.emojis.statuses.no} Invalid strike ID!` };

	const [[, userId = ""] = [], [, modId] = []] = [
		...message.content.matchAll(GlobalUsersPattern),
	];

	const isMod = CONSTANTS.roles.mod && interactor.roles.resolve(CONSTANTS.roles.mod.id);
	if (userId !== interactor.id && !isMod)
		return {
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} You don't have permission to view this member's strikes!`,
		};

	const member = await CONSTANTS.guild?.members.fetch(userId).catch(() => {});
	const user = member?.user || (await client.users.fetch(userId).catch(() => {}));

	const mod = isMod && modId && (await client.users.fetch(modId).catch(() => {}));
	const nick = member?.displayName ?? user?.username;
	const { url } = message.attachments.first() || {};
	const useMentions =
		userSettingsDatabase.data.find((settings) => interactor.id === settings.user)
			?.useMentions ?? false;
	return {
		components:
			isMod && !strike.removed
				? [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									customId: strike.id + "_remove_strike",
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
				description: url
					? await fetch(url).then((response) => response.text())
					: message.content,
				timestamp: message.createdAt.toISOString(),
				fields: [
					{
						name: "⚠ Count",
						value: "" + strike.count,
						inline: true,
					},
					...(mod
						? [
								{
									name: "🛡 Moderator",
									value: useMentions ? mod.toString() : mod.username,
									inline: true,
								},
						  ]
						: []),
					...(user
						? [
								{
									name: "👤 Target user",
									value: useMentions ? user.toString() : user.username,
									inline: true,
								},
						  ]
						: []),
					{
						name: "⏲ Date",
						value: time(new Date(strike.date), TimestampStyles.RelativeTime),
						inline: true,
					},
				],
			},
		],
	};
}
