import {
	GuildMember,
	type ApplicationCommandPermissionsUpdateData,
	type ModalSubmitInteraction,
	type PartialGuildMember,
	ComponentType,
	ButtonStyle,
	Colors,
	type ColorResolvable,
	ApplicationCommand,
	ChatInputCommandInteraction,
	TextInputStyle,
	type Snowflake,
	ApplicationCommandPermissionType,
	FormattingPatterns,
} from "discord.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import censor from "../automod/language.js";
import warn from "../punishments/warn.js";
import config from "../../common/config.js";
import { client } from "strife.js";
import { recentXpDatabase } from "../xp/misc.js";
import twemojiRegexp from "@twemoji/parser/dist/lib/regex.js";

const PREFIX = "✨ ";
let command: ApplicationCommand | undefined;

export async function customRole(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	command ??= interaction.command ?? undefined;
	if (!(interaction.member instanceof GuildMember))
		throw new TypeError("interaction.member is not a GuildMember!");

	if (!(await qualifiesForRole(interaction.member)))
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to create a custom role!`,
		});

	const existingRole = getCustomRole(interaction.member);

	await interaction.showModal({
		title: "Create Custom Role",
		customId: "_customRole",
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "name",
						label: `Role name${existingRole ? " (leave blank to delete)" : ""}`,
						style: TextInputStyle.Short,
						type: ComponentType.TextInput,
						maxLength: 100,
						required: !existingRole,
						value: existingRole?.name.replace(PREFIX, ""),
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "color",
						label: "Role color",
						style: TextInputStyle.Short,
						type: ComponentType.TextInput,
						maxLength: 100,
						required: false,
						value: existingRole?.hexColor,
					},
				],
			},
			...(config.guild.features.includes("ROLE_ICONS") &&
			config.roles.staff &&
			interaction.member.roles.resolve(config.roles.staff.id)
				? [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									customId: "icon",
									label: "A unicode emoji, emoji ID, or URL",
									style: TextInputStyle.Short,
									type: ComponentType.TextInput,
									required: false,
									value: existingRole?.iconURL() ?? undefined,
								} as const,
							],
						},
				  ]
				: []),
		],
	});
}

export async function createCustomRole(interaction: ModalSubmitInteraction) {
	if (!(interaction.member instanceof GuildMember))
		throw new TypeError("interaction.member is not a GuildMember!");

	const name = interaction.fields.fields.get("name")?.value;
	const color = (interaction.fields.fields.get("color")?.value || "#000000") as Extract<
		ColorResolvable,
		string
	>;
	const icon = interaction.fields.fields.get("icon")?.value;

	const existingRole = getCustomRole(interaction.member);

	if (!name) {
		if (!existingRole) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} You don’t have a custom role!`,
			});
		}

		const message = await interaction.reply({
			fetchReply: true,
			content: "🗑 Are you sure you want to delete your custom role?",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Delete",
							style: ButtonStyle.Danger,
							customId: `confirm-${interaction.id}`,
						},
						{
							type: ComponentType.Button,
							label: "Cancel",
							customId: `cancel-${interaction.id}`,
							style: ButtonStyle.Secondary,
						},
					],
				},
			],
		});
		message
			.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter: (buttonInteraction) => interaction.user.id === buttonInteraction.user.id,
				max: 1,
				time: constants.collectorTime,
			})
			.on("collect", async (buttonInteraction) => {
				if (buttonInteraction.customId.startsWith("cancel-")) {
					await buttonInteraction.deferUpdate();
					return;
				}

				await existingRole.delete(`Deleted by ${interaction.user.tag}`);
				await buttonInteraction.reply(
					`${constants.emojis.statuses.yes} Deleted your role ${existingRole.name} (${existingRole.hexColor})!`,
				);
			})
			.on("end", async () => {
				await message.edit({ components: disableComponents(message.components) });
			});

		return;
	}

	const censored = censor(name);
	if (censored) {
		await warn(
			interaction.user,
			"Please watch your language!",
			censored.strikes,
			`Attempted to make custom role @${name}`,
		);
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} ${
				censored.strikes < 1 ? "That’s not appropriate" : "Language"
			}!`,
		});
	}

	if (
		/\b(?:mod(?:erat(?:or|ion))?|admin(?:istrat(?:or|ion))?|owner|exec(?:utive)?|manager?|scradd)\b/i.test(
			name,
		) &&
		!(config.roles.staff && interaction.member.roles.resolve(config.roles.staff.id))
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Invalid role name!`,
		});
	}

	if (!(color in Colors) && color !== "Random" && !/^#[\da-f]{6}$/i.test(color)) {
		// todo: make colors case-insensitive
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Could not parse that color!`,
		});
	}

	const iconData = icon ? await resolveIcon(icon) : { unicodeEmoji: null, icon: null };
	if (!iconData)
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Could not resolve that icon! Make sure the like is a valid JPG, PNG, WEBP or GIF file under 256KB.`,
		});

	if (existingRole) {
		await existingRole.edit({
			color: color,
			name: PREFIX + name,
			reason: `Edited by ${interaction.user.tag}`,
			position: (config.roles.staff?.position ?? 0) + 1,
			...iconData,
		});

		return await interaction.reply(`${constants.emojis.statuses.yes} Updated your role!`);
	}

	const role = await config.guild.roles.create({
		color: color,
		name: PREFIX + name,
		reason: `Created by ${interaction.user.tag}`,
		position: (config.roles.staff?.position ?? 0) + 1,
		...iconData,
	});
	await interaction.member.roles.add(role, "Custom role created");
	return await interaction.reply(`${constants.emojis.statuses.yes} Created your custom role!`);
}
export async function deleteMemberRoles(member: PartialGuildMember | GuildMember) {
	for (const [, role] of await config.guild.roles.fetch()) {
		if (role.name.startsWith(PREFIX) && !role.members.size) {
			await role.delete(`${member.user.tag} left the server`);
		}
	}
}
export async function recheckMemberRole(_: PartialGuildMember | GuildMember, member: GuildMember) {
	if (member.guild.id !== config.guild.id) return;

	const role = getCustomRole(member);

	if (!(await qualifiesForRole(member))) {
		await role?.delete("No longer qualifies");
		return;
	}

	if (
		config.guild.features.includes("ROLE_ICONS") &&
		!(config.roles.staff && member.roles.resolve(config.roles.staff.id))
	) {
		await role?.setUnicodeEmoji(null, "No longer qualifies");
		await role?.setIcon(null, "No longer qualifies");
	}
}
export async function recheckAllRoles(permissions: ApplicationCommandPermissionsUpdateData) {
	if (permissions.guildId !== config.guild.id || permissions.applicationId !== client.user.id)
		return;

	for (const [, role] of await config.guild.roles.fetch()) {
		if (role.name.startsWith(PREFIX)) {
			const member = role.members.first();
			if (!member) {
				await role.delete("Unused role");
				continue;
			}
			if (!(await qualifiesForRole(member))) await role.delete("No longer qualifies");
		}
	}
}

export function getCustomRole(member: GuildMember) {
	return member.roles.valueOf().find((role) => role.name.startsWith(PREFIX));
}

export async function qualifiesForRole(member: GuildMember) {
	if (
		member.roles.premiumSubscriberRole ||
		(config.roles.staff && member.roles.resolve(config.roles.staff.id))
	)
		return true;
	const recentXp = [...recentXpDatabase.data].sort((one, two) => one.time - two.time);
	const maxDate = (recentXp[0]?.time ?? 0) + 604_800_000;
	const lastWeekly = Object.entries(
		recentXp.reduce<Record<Snowflake, number>>((accumulator, gain) => {
			if (gain.time > maxDate) return accumulator;

			accumulator[gain.user] = (accumulator[gain.user] ?? 0) + gain.xp;
			return accumulator;
		}, {}),
	).sort((one, two) => two[1] - one[1]);
	if (lastWeekly[0]?.[0] === member.user.id) return true;

	command ??= (await config.guild.commands.fetch()).find(
		(command) => command.name === "custom-role",
	);
	const permissions =
		command && (await config.guild.commands.permissions.fetch({ command }).catch(() => void 0));
	return permissions?.some(
		(permission) =>
			permission.type === ApplicationCommandPermissionType.User &&
			permission.id === member.user.id &&
			permission.permission,
	);
}

const isTwemoji = new RegExp(`^${twemojiRegexp.default.source}$`);
const isServerEmoji = new RegExp(`^${FormattingPatterns.Emoji.source}$`);
const validContentTypes = new Set([
	"image/jpeg",
	"image/png",
	"image/apng",
	"image/gif",
	"image/webp",
]);
/** Valid strings: string matching twemojiRegexp, Snowflake of existing server emoji, data: URL, string starting with https:// */
async function resolveIcon(icon: string) {
	if (isTwemoji.test(icon)) return { unicodeEmoji: icon };

	const id = icon.match(isServerEmoji)?.groups?.id || (/^\d{17,20}$/.test(icon) && icon);
	const url = id && config.guild.emojis.resolve(id)?.url;
	if (url) return { icon: url };

	if (icon.startsWith("data:")) return { icon };

	if (!/^https?:\/\//.test(icon)) return;
	try {
		new URL(icon);
	} catch {
		return;
	}

	const response = await fetch(icon, { method: "HEAD" });
	if (!response.ok) return;

	const contentLength = +(response.headers.get("Content-Length") ?? Number.POSITIVE_INFINITY);
	if (contentLength > 256_000) return;

	const contentType = response.headers.get("Content-Type");
	if (!contentType || !validContentTypes.has(contentType)) return;

	return { icon };
}
