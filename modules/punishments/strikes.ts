import {
	ButtonStyle,
	ComponentType,
	GuildMember,
	type InteractionResponse,
	type Message,
	type RepliableInteraction,
	type User,
} from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { mentionUser } from "../settings.js";
import { EXPIRY_LENGTH } from "./misc.js";
import filterToStrike, { listStrikes } from "./util.js";

export async function getStrikes(
	selected: GuildMember | User,
	interaction: RepliableInteraction,
	options?: { expired?: boolean; removed?: boolean },
): Promise<InteractionResponse | undefined> {
	if (
		selected.id !== interaction.user.id &&
		!(interaction.member instanceof GuildMember ?
			interaction.member.roles.resolve(config.roles.mod.id)
		:	interaction.member?.roles.includes(config.roles.mod.id))
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to view this member’s strikes!`,
		});
	}

	await interaction.deferReply({ ephemeral: true });
	await listStrikes(
		selected instanceof GuildMember ? selected : (
			await config.guild.members.fetch(selected.id).catch(() => selected)
		),
		(data) => interaction.editReply(data),
		options,
		interaction.user,
	);
}

export async function getStrikeById(
	interaction: RepliableInteraction,
	filter: string,
): Promise<Message> {
	if (!(interaction.member instanceof GuildMember))
		throw new TypeError("interaction.member is not a GuildMember");

	await interaction.deferReply({ ephemeral: true });

	const strike = await filterToStrike(filter);
	if (!strike)
		return await interaction.editReply(`${constants.emojis.statuses.no} Invalid strike ID!`);

	const isModerator = interaction.member.roles.resolve(config.roles.mod.id);
	if (strike.user !== interaction.member.id && !isModerator) {
		return await interaction.editReply(
			`${constants.emojis.statuses.no} You don’t have permission to view this member’s strikes!`,
		);
	}

	const member = await config.guild.members.fetch(strike.user).catch(() => void 0);
	const user = member?.user ?? (await client.users.fetch(strike.user).catch(() => void 0));

	const moderator =
		isModerator && strike.mod === "AutoMod" ?
			strike.mod
		:	strike.mod &&
			(await mentionUser(strike.mod, interaction.member, interaction.guild ?? config.guild));
	const nick = (member ?? user)?.displayName;
	return await interaction.editReply({
		components:
			isModerator ?
				[
					{
						type: ComponentType.ActionRow,

						components: [
							strike.removed ?
								{
									type: ComponentType.Button,
									customId: `${strike.id}_addStrikeBack`,
									label: "Add back",
									style: ButtonStyle.Primary,
								}
							:	{
									type: ComponentType.Button,
									customId: `${strike.id}_removeStrike`,
									label: "Remove",
									style: ButtonStyle.Danger,
								},
						],
					},
				]
			:	[],

		embeds: [
			{
				color: member?.displayColor,

				author:
					nick ?
						{ icon_url: (member ?? user)?.displayAvatarURL(), name: nick }
					:	undefined,

				title: `${
					strike.removed ? "~~"
					: strike.date + EXPIRY_LENGTH > Date.now() ? ""
					: "*"
				}Strike \`${strike.id}\`${
					strike.removed ? "~~"
					: strike.date + EXPIRY_LENGTH > Date.now() ? ""
					: "*"
				}`,

				description: strike.reason,
				timestamp: new Date(strike.date).toISOString(),

				fields: [
					{
						name: "⚠️ Count",
						value: strike.count < 1 ? "verbal" : Math.floor(strike.count).toString(),
						inline: true,
					},
					...(moderator ?
						[{ name: "🛡 Moderator", value: moderator, inline: true }]
					:	[]),
					...(user ?
						[
							{
								name: "👤 Target user",
								value: await mentionUser(
									user,
									interaction.member,
									interaction.guild ?? config.guild,
								),
								inline: true,
							},
						]
					:	[]),
				],
			},
		],
	});
}
