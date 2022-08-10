import {
	Embed,
	SlashCommandBuilder,
	GuildMember,
	ActionRowBuilder,
	ButtonBuilder,
	MessageMentions,
	time,
} from "discord.js";
import fetch from "node-fetch";
import CONSTANTS from "../common/CONSTANTS.js";
import { getDatabases } from "../common/databases.js";
import { getThread } from "../common/moderation/logging.js";
import { getData, WARN_INFO_BASE } from "../common/moderation/warns.js";
import { convertBase } from "../lib/numbers.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("View your or (Mods only) someone else’s active strikes")
		.addStringOption((input) =>
			input
				.setName("filter")
				.setDescription(
					"A case ID to see its details or a ping to see their strikes (defaults to you)",
				)
				.setRequired(false),
		),

	async interaction(interaction) {
		if (!(interaction.member instanceof GuildMember))
			throw new TypeError("Member is not a GuildMember");
		return getWarns(
			async (data) => await interaction.reply(data),
			interaction.options.getString("filter"),
			interaction.member,
		);
	},
	censored: false,
};

export default info;

/**
 * @param {import("discord.js").User | import("discord.js").GuildMember} user
 * @param {import("discord.js").Guild | null} guild
 *
 * @returns {Promise<import("discord.js").InteractionReplyOptions>}
 */
async function getWarnsForMember(user, guild = user instanceof GuildMember ? user.guild : null) {
	if (!guild) throw new TypeError("Expected guild to be passed as user is not a GuildMember");
	const { warn: warnLog, mute: muteLog } = await getDatabases(["warn", "mute"], guild);

	const [allWarns, allMutes] = await Promise.all([getData(warnLog, true), getData(muteLog)]);
	const warns = allWarns.filter((warn) => warn.user === user.id);
	const mutes = allMutes.filter((mute) => mute.user === user.id);

	const member = user instanceof GuildMember ? user : await guild?.members.fetch(user.id);

	const strikes = await Promise.all(
		warns
			.filter((warn, index) => warns.findIndex((w) => w.info == warn.info) == index)
			.sort((one, two) => two.expiresAt - one.expiresAt),
	);
	const embed = new Embed()
		.setTitle(
			`${member.displayName} has ${warns.length} active strike${
				warns.length === 1 ? "" : "s"
			}`,
		)
		.setAuthor({ iconURL: member.displayAvatarURL(), name: member.displayName })
		.setColor(member.displayColor)
		.setDescription(
			(
				await Promise.all(
					strikes.map(async (warn) => {
						const strikes = warns.filter(({ info }) => info === warn.info).length;

						return `\`${convertBase(warn.info || "", 10, WARN_INFO_BASE)}\`${
							strikes === 1 ? "" : ` (*${strikes})`
						}: expiring ${time(warn.expiresAt, "R")}`;
					}),
				)
			).join("\n") || `${user.toString()} has no recent strikes!`,
		);
	if (mutes.length)
		embed.setFooter({
			text:
				`${member.displayName} has been muted ` +
				mutes.length +
				` time${mutes.length === 1 ? "" : "s"} recently.`,
		});
	return {
		components: strikes.length
			? [
					new ActionRowBuilder().addComponents(
						strikes.map((warn) =>
							new ButtonBuilder()
								.setLabel(convertBase(warn.info || "", 10, WARN_INFO_BASE))
								.setStyle("SECONDARY")
								.setCustomId(
									`${convertBase(warn.info || "", 10, WARN_INFO_BASE)}_strike`,
								),
						),
					),
			  ]
			: [],
		embeds: [embed],
		ephemeral: true,
	};
}

/**
 * @param {(options: string | import("discord.js").InteractionReplyOptions | import("discord.js").MessagePayload) => Promise<void>} reply
 * @param {string | null} filter
 * @param {import("discord.js").GuildMember} interactor
 *
 * @returns
 */
export async function getWarns(reply, filter, interactor) {
	if (filter) {
		const pinged = filter.match(MessageMentions.USERS_PATTERN)?.[1];
		if (pinged) {
			const user = await interactor.client.users.fetch(pinged);

			if (!user)
				return await reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} Invalid filter!`,
				});

			await reply(await getWarnsForMember(user, interactor.guild));
		} else {
			const id = convertBase(filter, WARN_INFO_BASE, 10);
			const channel = interactor.guild && (await getThread("members", interactor.guild));

			const idMessage = await channel?.messages.fetch(id).catch(() => {});
			const message = idMessage || (await channel?.messages.fetch(filter).catch(() => {}));

			if (!message)
				return await reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} Invalid filter!`,
				});

			const reason = await fetch(message.attachments.first()?.url || "").then((response) =>
				response.text(),
			);
			const [, userId = "", moderatorId = ""] =
				message.content.match(MessageMentions.USERS_PATTERN) || [];
			// todo: this isn't global anymore

			const member = await interactor.guild?.members.fetch(userId).catch(() => {});

			const user =
				member?.user || (await interactor.client.users.fetch(userId).catch(() => {}));

			const nick = member?.displayName ?? user?.username;

			const mod =
				(await interactor.guild?.members.fetch(moderatorId).catch(() => {})) ||
				(await interactor.client.users.fetch(moderatorId).catch(() => {}));

			const warnLog = (await getDatabases(["warn"], interactor.guild)).warn;
			const allWarns = await getData(warnLog, true);
			const caseId = idMessage ? filter : convertBase(filter, 10, WARN_INFO_BASE);
			const { expiresAt } = allWarns.find((warn) => warn.info === message.id) || {};

			const embed = new Embed()
				.setColor(member?.displayColor ?? null)
				.setAuthor(
					nick ? { iconURL: (member || user)?.displayAvatarURL(), name: nick } : null,
				)
				.setTitle(`Case \`${caseId}\``)
				.setDescription(reason)
				.setTimestamp(message.createdAt);

			const strikes = / \d+ /.exec(message.content)?.[0]?.trim() ?? "0";
			embed.addFields({ name: "Strikes", value: strikes, inline: true });

			if (mod && interactor.roles.resolve(process.env.MODERATOR_ROLE || ""))
				embed.addFields({ name: "Moderator", value: mod.toString(), inline: true });

			if (user)
				embed.addFields({ name: "Target user", value: user.toString(), inline: true });

			if (expiresAt)
				embed.addFields({
					name: "Expirery",
					value: time(expiresAt, "R"),
					inline: true,
				});

			await reply({ ephemeral: true, embeds: [embed] });
		}
	} else {
		await reply(await getWarnsForMember(interactor, interactor.guild));
		return;
	}
}
