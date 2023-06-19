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
} from "discord.js";
import { defineCommand, defineEvent, defineModal } from "strife.js";
import constants from "../common/constants.js";
import { disableComponents } from "../util/discord.js";
import { recentXpDatabase } from "./xp/misc.js";

export const rolesDatabase = new Database<{
	user: Snowflake;
	designer: boolean;
	scradd: boolean;
	formerAdmin: boolean;
	formerMod: boolean;
	dev: boolean;
	translator: boolean;
	contributor: boolean;
	epic: boolean;
	booster: boolean;
}>("roles");
await rolesDatabase.init();

const roles = {
	designer: "916020774509375528",
	scradd: "1008190416396484700",
	formerAdmin: "1069776422467555328",
	formerMod: "881623848137682954",
	dev: "806608777835053098",
	translator: "841696608592330794",
	contributor: "991413187427700786",
	epic: config.roles.epic?.id || "",
	booster: config.roles.booster?.id || "",
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

	const databaseIndex = rolesDatabase.data.findIndex((entry) => entry.user === member.id);

	const memberRoles = {
		user: member.id,
		...Object.fromEntries(
			Object.entries(roles).map(([key, value]) => [key, !!member.roles.resolve(value)]),
		),
	};

	if (databaseIndex === -1) rolesDatabase.data = [...rolesDatabase.data, memberRoles];
	else {
		const allRoles = [...rolesDatabase.data];
		allRoles[databaseIndex] = memberRoles;
		rolesDatabase.data = allRoles;
	}
});

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	const memberRoles = rolesDatabase.data.find((entry) => entry.user === member.id);
	for (const roleName of Object.keys(roles))
		if (memberRoles?.[roleName]) member.roles.add(roles[roleName], "Persisting roles");
});

defineEvent("guildMemberUpdate", async (_, newMember) => {
	if (newMember.guild.id !== config.guild.id) return;

	if (newMember.roles.premiumSubscriberRole && config.roles.booster)
		await newMember.roles.add(config.roles.booster, "Boosted the server");
});

defineCommand(
	{ name: "custom-role", description: "Create a custom role for yourself", restricted: true },
	async (interaction) => {
		if (!(interaction.member instanceof GuildMember))
			throw new TypeError("interaction.member is not a GuildMember!");

		const permissions = interaction.command
			? await config.guild.commands.permissions.fetch({ command: interaction.command })
			: undefined;
		const recentXp = [...recentXpDatabase.data].sort((one, two) => one.time - two.time);
		const maxDate = (recentXp[0]?.time ?? 0) + 604_800_000;
		const lastWeekly = Object.entries(
			recentXp.reduce<Record<Snowflake, number>>((acc, gain) => {
				if (gain.time > maxDate) return acc;

				acc[gain.user] = (acc[gain.user] ?? 0) + gain.xp;
				return acc;
			}, {}),
		).sort((one, two) => two[1] - one[1]);

		if (
			!interaction.member.roles.premiumSubscriberRole &&
			!permissions?.some(
				(permission) =>
					permission.type === ApplicationCommandPermissionType.User &&
					permission.id === interaction.user.id &&
					permission.permission,
			) &&
			lastWeekly[0]?.[0] !== interaction.user.id
		)
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} You can’t use this command!`,
			});

		const existingRole = interaction.member.roles
			.valueOf()
			.find((role) => role.name.startsWith("✨ "));

		await interaction.showModal({
			title: "Create Role",
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
							value: existingRole?.name.replace("✨ ", ""),
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
			? interaction.member.roles.valueOf().find((role) => role.name.startsWith("✨ "))
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
				filter: (buttonInteraction) =>
					interaction.user.id === buttonInteraction.user.id &&
					buttonInteraction.customId.endsWith(`-${interaction.id}`),
				max: 1,
				time: constants.collectorTime,
			})
			.on("collect", async (buttonInteraction) => {
				if (buttonInteraction.customId.startsWith("cancel-")) {
					await buttonInteraction.deferUpdate();
					return;
				}

				await existingRole.delete("Deleted by user");
				await buttonInteraction.reply(
					`${constants.emojis.statuses.yes} Deleted your role ${existingRole.name} (${existingRole.hexColor})!`,
				);
			})
			.on("end", async () => {
				await message.edit({ components: disableComponents(message.components) });
			});

		return;
	}

	if (color && !(color in Colors) && color !== "Random" && !/^#[a0-9a-f]{6}$/.test(color)) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Could not parse that color!`,
		});
	}

	if (existingRole) {
		await existingRole.setColor((color as ColorResolvable) || "#000000", "Edited by user");
		await existingRole.setName("✨ " + name, "Edited by user");

		return await interaction.reply(`${constants.emojis.statuses.yes} Updated your role!`);
	}

	const role = await config.guild.roles.create({
		color: (color as ColorResolvable) || "#000000",
		name: "✨ " + name,
		reason: "Created by user",
		position: (config.guild.roles.premiumSubscriberRole?.position ?? 0) + 1,
	});
	await interaction.member.roles.add(role);
	return await interaction.reply(`${constants.emojis.statuses.yes} Created your custom role!`);
});
