import config from "../common/config.js";
import Database from "../common/database.js";
import {
	Collection,
	ComponentType,
	GuildMember,
	TextInputStyle,
	type Snowflake,
	Colors,
	type ColorResolvable,
	ButtonStyle,
	ApplicationCommandPermissionType,
	ApplicationCommand,
} from "discord.js";
import { client, defineCommand, defineEvent, defineModal } from "strife.js";
import constants from "../common/constants.js";
import { disableComponents } from "../util/discord.js";
import { recentXpDatabase } from "./xp/misc.js";
import censor from "./automod/language.js";
import warn from "./punishments/warn.js";

const PREFIX = "✨ ";
let command: ApplicationCommand | undefined;

export const rolesDatabase = new Database<{
	id: Snowflake;
	designer: boolean;
	scradd: boolean;
	formerAdmin: boolean;
	formerMod: boolean;
	dev: boolean;
	translator: boolean;
	contributor: boolean;
	og: boolean;
	epic: boolean;
	booster: boolean;
}>("roles");
await rolesDatabase.init();

const persistedRoles = {
	designer: "916020774509375528",
	scradd: "1008190416396484700",
	formerAdmin: ["1069776422467555328", config.roles.admin?.id || ""],
	formerMod: ["881623848137682954", config.roles.mod?.id || ""],
	dev: "806608777835053098",
	translator: "841696608592330794",
	contributor: "991413187427700786",
	epic: config.roles.epic?.id || "",
	booster: config.roles.booster?.id || "",
	og: "1107170572963684402",
};

defineEvent("guildMemberAdd", async () => {
	const inviters = (await config.guild.invites.fetch()).reduce((accumulator, invite) => {
		const inviter = invite.inviter?.id ?? "";
		accumulator.set(inviter, (accumulator.get(inviter) ?? 0) + (invite.uses ?? 0));
		return accumulator;
	}, new Collection<Snowflake, number>());
	inviters.map(async (count, user) => {
		if (count < 20) return;
		const inviter = await config.guild.members.fetch(user).catch(() => {});
		if (
			!inviter ||
			inviter.id === constants.users.hans ||
			inviter.user.bot ||
			!config.roles.epic ||
			inviter.roles.resolve(config.roles.epic.id)
		)
			return;
		await inviter.roles.add(config.roles.epic, "Invited 20+ people");
		await config.channels.general?.send(
			`🎊 ${inviter.toString()} Thanks for inviting 20+ people! Here’s ${config.roles.epic.toString()} as a thank-you.`,
		);
	});
});

defineEvent("guildMemberRemove", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	const memberRoles = {
		id: member.id,
		...Object.fromEntries(
			Object.entries(persistedRoles).map(([key, ids]) => [
				key,
				[ids].flat().some((id) => !!member.roles.resolve(id)),
			]),
		),
	};

	if (!Object.values(memberRoles).includes(false)) return;
	rolesDatabase.updateById(memberRoles, {});
});

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	const memberRoles = rolesDatabase.data.find((entry) => entry.id === member.id);
	for (const roleName of Object.keys(persistedRoles))
		if (memberRoles?.[roleName])
			member.roles.add([persistedRoles[roleName]].flat()[0] ?? "", "Persisting roles");
});

defineEvent("guildMemberUpdate", async (_, member) => {
	if (member.guild.id !== config.guild.id) return;

	if (member.roles.premiumSubscriberRole && config.roles.booster)
		await member.roles.add(config.roles.booster, "Boosted the server");
});

defineCommand(
	{ name: "custom-role", description: "Create a custom role for yourself", restricted: true },
	async (interaction) => {
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
			],
		});
	},
);

defineModal("customRole", async (interaction) => {
	if (!(interaction.member instanceof GuildMember))
		throw new TypeError("interaction.member is not a GuildMember!");

	const name = interaction.fields.fields.get("name")?.value;
	const color = interaction.fields.fields.get("color")?.value;

	const existingRole =
		interaction.member instanceof GuildMember
			? interaction.member.roles.valueOf().find((role) => role.name.startsWith(PREFIX))
			: undefined;

	if (!name) {
		if (!existingRole) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} You don’t have a custom role!`,
			});
		}

		const message = await interaction.reply({
			fetchReply: true,
			content: `🗑 Are you sure you want to delete your custom role?`,
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
			"Watch your language!",
			censored.strikes,
			`Attempted to make custom role @${name}`,
		);
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} ${
				censored.strikes < 1 ? "That's not appropriate" : "Language"
			}!`,
		});
	}

	if (
		name.match(
			/\b(?:mod(?:erat(?:or|ion))?|admin(?:istrat(?:or|ion))|owner|exec(?:utive)|manager|scradd)\b/i,
		)
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Invalid role name!`,
		});
	}

	if (color && !(color in Colors) && color !== "Random" && !/^#[a0-9a-f]{6}$/.test(color)) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Could not parse that color!`,
		});
	}

	if (existingRole) {
		await existingRole.setColor(
			(color as ColorResolvable) || "#000000",
			`Edited by ${interaction.user.tag}`,
		);
		await existingRole.setName(PREFIX + name, `Edited by ${interaction.user.tag}`);

		return await interaction.reply(`${constants.emojis.statuses.yes} Updated your role!`);
	}

	const role = await config.guild.roles.create({
		color: (color as ColorResolvable) || "#000000",
		name: PREFIX + name,
		reason: `Created by ${interaction.user.tag}`,
		position: (config.guild.roles.premiumSubscriberRole?.position ?? 0) + 1,
	});
	await interaction.member.roles.add(role, "Custom role created");
	return await interaction.reply(`${constants.emojis.statuses.yes} Created your custom role!`);
});

defineEvent("guildMemberRemove", async (member) => {
	for (const [, role] of await config.guild.roles.fetch()) {
		if (role.name.startsWith(PREFIX) && !role.members.size) {
			await role.delete(`${member.user.tag} left the server`);
		}
	}
});

defineEvent("guildMemberUpdate", async (_, member) => {
	if (member.guild.id !== config.guild.id) return;

	if (!(await qualifiesForRole(member))) {
		await member.roles
			.valueOf()
			.find((role) => role.name.startsWith(PREFIX))
			?.delete("No longer qualifies");
	}
});

defineEvent("applicationCommandPermissionsUpdate", async (permissions) => {
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
});

export function getCustomRole(member: GuildMember) {
	return member.roles
		.valueOf()
		.find((role) => role.name.startsWith(PREFIX));
}

export async function qualifiesForRole(member: GuildMember) {
	if (member.roles.premiumSubscriberRole) return true;

	const recentXp = [...recentXpDatabase.data].sort((one, two) => one.time - two.time);
	const maxDate = (recentXp[0]?.time ?? 0) + 604_800_000;
	const lastWeekly = Object.entries(
		recentXp.reduce<Record<Snowflake, number>>((acc, gain) => {
			if (gain.time > maxDate) return acc;

			acc[gain.user] = (acc[gain.user] ?? 0) + gain.xp;
			return acc;
		}, {}),
	).sort((one, two) => two[1] - one[1]);
	if (lastWeekly[0]?.[0] === member.user.id) return true;

	command ??= (await config.guild.commands.fetch()).find(
		(command) => command.name === "custom-role",
	);
	const permissions =
		command && (await config.guild.commands.permissions.fetch({ command }).catch(() => {}));
	return permissions?.some(
		(permission) =>
			permission.type === ApplicationCommandPermissionType.User &&
			permission.id === member.user.id &&
			permission.permission,
	);
}
