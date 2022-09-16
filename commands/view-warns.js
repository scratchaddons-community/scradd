import {
	EmbedBuilder,
	SlashCommandBuilder,
	GuildMember,
	ButtonBuilder,
	MessageMentions,
	time,
	ButtonStyle,
} from "discord.js";
import fetch from "node-fetch";
import client, { guild } from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { getLoggingThread } from "../common/moderation/logging.js";
import {
	removeExpiredWarns,
	muteLog,
	warnLog,
	WARN_INFO_BASE,
} from "../common/moderation/warns.js";
import { convertBase } from "../lib/numbers.js";
import { MessageActionRowBuilder } from "../common/types/ActionRowBuilder.js";

/** @type {import("../common/types/command").ChatInputCommand} */
export default {
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
			throw new TypeError("Member isn’t a GuildMember");
		getWarns(
			async (data) => await interaction.reply(data),
			interaction.member,
			interaction.options.getString("filter") ?? undefined,
		);
	},
	censored: false,
};

/**
 * @param {import("discord.js").User | import("discord.js").GuildMember} user
 *
 * @returns {Promise<import("discord.js").InteractionReplyOptions>}
 */
async function getWarnsForMember(user) {
	const warns = (await removeExpiredWarns(warnLog)).filter((warn) => warn.user === user.id);
	const mutes = (await removeExpiredWarns(muteLog)).filter((mute) => mute.user === user.id);

	const member =
		user instanceof GuildMember ? user : await guild?.members.fetch(user.id).catch(() => {});

	const strikes = await Promise.all(
		warns
			.filter((warn, index) => warns.findIndex((w) => w.info == warn.info) == index)
			.sort((one, two) => two.expiresAt - one.expiresAt),
	);
	const embed = new EmbedBuilder()
		.setTitle(
			`${
				member?.displayName ||
				(user instanceof GuildMember ? user.user.username : user.username)
			} has ${warns.length} active strike${warns.length === 1 ? "" : "s"}`,
		)
		.setAuthor({
			iconURL: (member || user).displayAvatarURL(),
			name: user instanceof GuildMember ? user.user.username : user.username,
		})
		.setColor(member?.displayColor || null)
		.setDescription(
			(
				await Promise.all(
					strikes.map(async (warn) => {
						const strikes = warns.filter(({ info }) => info === warn.info).length;

						return `\`${convertBase(warn.info || "", 10, WARN_INFO_BASE)}\`${
							strikes === 1 ? "" : ` (*${strikes})`
						}: expiring ${time(new Date(warn.expiresAt), "R")}`;
					}),
				)
			).join("\n") || `${user.toString()} has no recent strikes!`,
		);
	if (mutes.length)
		embed.setFooter({
			text:
				`${
					user instanceof GuildMember ? user.user.username : user.username
				} has been muted ` +
				mutes.length +
				` time${mutes.length === 1 ? "" : "s"} recently.`,
		});
	return {
		components: strikes.length
			? [
					new MessageActionRowBuilder().addComponents(
						strikes.map((warn) =>
							new ButtonBuilder()
								.setLabel(convertBase(warn.info || "", 10, WARN_INFO_BASE))
								.setStyle(ButtonStyle.Secondary)
								.setCustomId(`${warn.info}_strike`),
						),
					),
			  ]
			: [],
		embeds: [embed],
		ephemeral: true,
	};
}

/**
 * @param {(options: import("discord.js").InteractionReplyOptions) => Promise<import("discord.js").InteractionResponse>} reply
 * @param {import("discord.js").GuildMember} interactor
 * @param {string} [filter]
 */
export async function getWarns(reply, interactor, filter) {
	const isMod = CONSTANTS.roles.mod && interactor.roles.resolve(CONSTANTS.roles.mod.id);
	if (filter) {
		const pinged = filter.match(MessageMentions.UsersPattern)?.[1];
		if (pinged) {
			const user =
				pinged === interactor.id
					? interactor
					: isMod && (await client.users.fetch(pinged).catch(() => {}));

			if (user) return await reply(await getWarnsForMember(user));
		} else {
			const id = convertBase(filter, WARN_INFO_BASE, 10);
			const channel = await getLoggingThread("members");

			const idMessage = await channel?.messages.fetch(id).catch(() => {});
			const message = idMessage || (await channel?.messages.fetch(filter).catch(() => {}));

			if (!message) {
				await reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} Invalid filter!`,
				});
				return;
			}

			/** A global regular expression variant of {@link MessageMentions.UsersPattern}. */
			const GlobalUsersPattern = new RegExp(MessageMentions.UsersPattern.source, "g");

			const userId = GlobalUsersPattern.exec(message.content)?.[1] || "";
			if (userId !== interactor.id && !isMod)
				return await reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} Invalid filter!`,
				});
			const member = await guild?.members.fetch(userId).catch(() => {});

			const user = member?.user || (await client.users.fetch(userId).catch(() => {}));

			const nick = member?.displayName ?? user?.username;
			const caseId = idMessage ? filter : convertBase(filter, 10, WARN_INFO_BASE);
			const embed = new EmbedBuilder()
				.setColor(member?.displayColor ?? null)
				.setAuthor(
					nick ? { iconURL: (member || user)?.displayAvatarURL(), name: nick } : null,
				)
				.setTitle(`Case \`${caseId}\``)
				.setDescription(
					await fetch(message.attachments.first()?.url || "").then((response) =>
						response.text(),
					),
				)
				.setTimestamp(message.createdAt)
				.addFields({
					name: "⚠ Strikes",
					value: / \d+ /.exec(message.content)?.[0]?.trim() ?? "0",
					inline: true,
				});

			const moderatorId = GlobalUsersPattern.exec(message.content)?.[1] || "";
			const mod =
				isMod &&
				((await guild?.members.fetch(moderatorId).catch(() => {})) ||
					(await client.users.fetch(moderatorId).catch(() => {})));
			if (mod) embed.addFields({ name: "🛡 Moderator", value: mod.toString(), inline: true });

			if (user)
				embed.addFields({ name: "🫂 Target user", value: user.toString(), inline: true });

			const allWarns = await removeExpiredWarns(warnLog);
			const { expiresAt } = allWarns.find((warn) => warn.info === message.id) || {};
			if (expiresAt)
				embed.addFields({
					name: "⏲ Expirery",
					value: time(new Date(expiresAt), "R"),
					inline: true,
				});

			return await reply({ ephemeral: true, embeds: [embed] });
		}
	} else {
		return await reply(await getWarnsForMember(interactor));
	}

	await reply({
		ephemeral: true,
		content: `${CONSTANTS.emojis.statuses.no} Invalid filter!`,
	});
}
