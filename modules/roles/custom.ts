import {
	GuildMember,
	type ModalSubmitInteraction,
	type PartialGuildMember,
	ComponentType,
	ButtonStyle,
	type ApplicationCommand,
	type ChatInputCommandInteraction,
	TextInputStyle,
	type Snowflake,
	ApplicationCommandPermissionType,
	type Role,
} from "discord.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import tryCensor from "../automod/misc.js";
import warn from "../punishments/warn.js";
import config from "../../common/config.js";
import { recentXpDatabase } from "../xp/util.js";
import { asyncFilter } from "../../util/promises.js";
import { CUSTOM_ROLE_PREFIX, parseColor, resolveIcon } from "./misc.js";

let command: ApplicationCommand | undefined;

export async function customRole(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	command ??= interaction.command ?? undefined;
	if (!(interaction.member instanceof GuildMember))
		throw new TypeError("interaction.member is not a GuildMember!");

	const existingRole = getCustomRole(interaction.member);

	if (!existingRole && !(await qualifiesForRole(interaction.member)))
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to create a custom role!`,
		});

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
						maxLength: 98,
						required: !existingRole,
						value: existingRole?.name.replace(CUSTOM_ROLE_PREFIX, ""),
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
	const rawColor = interaction.fields.fields.get("color")?.value;
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

	const censored = tryCensor(name);
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

	const color = parseColor(rawColor);
	if (rawColor && !color) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Could not parse that color!`,
		});
	}

	const iconData = icon ? await resolveIcon(icon) : { unicodeEmoji: null, icon: null };
	if (!iconData)
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Could not resolve that icon! Make sure the link is a valid JPG, PNG, WEBP or GIF file under 256KB.`,
		});

	if (existingRole) {
		await existingRole.edit({
			color,
			name: CUSTOM_ROLE_PREFIX + name,
			reason: `Edited by ${interaction.user.tag}`,
			...iconData,
		});

		return await interaction.reply(`${constants.emojis.statuses.yes} Updated your role!`);
	}

	const role = await config.guild.roles.create({
		color,
		name: CUSTOM_ROLE_PREFIX + name,
		reason: `Created by ${interaction.user.tag}`,
		position: (config.roles.staff?.position ?? 0) + 1,
		...iconData,
	});
	await interaction.member.roles.add(role, "Custom role created");
	return await interaction.reply(`${constants.emojis.statuses.yes} Created your custom role!`);
}

export async function recheckMemberRole(_: GuildMember | PartialGuildMember, member: GuildMember) {
	const role = getCustomRole(member);
	if (!role) return;
	await recheckRole(role);
}
export async function recheckAllRoles() {
	for (const [, role] of await config.guild.roles.fetch()) {
		if (role.name.startsWith(CUSTOM_ROLE_PREFIX)) {
			await recheckRole(role);
		}
	}
}
async function recheckRole(role: Role, reason = "No longer qualifies") {
	if (!role.members.size) return await role.delete("Unused role");

	const anyQualify = await asyncFilter([...role.members.values()], qualifiesForRole).next();
	if (!anyQualify.value) return await role.delete(reason);

	if (
		config.guild.features.includes("ROLE_ICONS") &&
		!role.members.some(
			(member) => config.roles.staff && member.roles.resolve(config.roles.staff.id),
		)
	) {
		await role.setUnicodeEmoji(null, reason);
		await role.setIcon(null, reason);
	}
}

export function getCustomRole(member: GuildMember) {
	return member.roles.valueOf().find((role) => role.name.startsWith(CUSTOM_ROLE_PREFIX));
}
export async function qualifiesForRole(member: GuildMember) {
	if (
		member.roles.premiumSubscriberRole ||
		(config.roles.staff && member.roles.resolve(config.roles.staff.id))
	)
		return true;
	const recentXp = recentXpDatabase.data.toSorted((one, two) => one.time - two.time);
	const maxDate = (recentXp[0]?.time ?? 0) + 604_800_000;
	const lastWeekly = Object.entries(
		recentXp.reduce<Record<Snowflake, number>>((accumulator, gain) => {
			if (gain.time > maxDate) return accumulator;

			accumulator[gain.user] = (accumulator[gain.user] ?? 0) + gain.xp;
			return accumulator;
		}, {}),
	).toSorted((one, two) => two[1] - one[1]);
	if (lastWeekly[0]?.[0] === member.user.id) return true;

	command ??= (await config.guild.commands.fetch()).find(({ name }) => name === "custom-role");
	const permissions =
		command && (await config.guild.commands.permissions.fetch({ command }).catch(() => void 0));
	return permissions?.some(
		(permission) =>
			permission.type === ApplicationCommandPermissionType.User &&
			permission.id === member.user.id &&
			permission.permission,
	);
}
