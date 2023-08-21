import config from "../../common/config.js";
import { type Snowflake, Collection } from "discord.js";
import { defineCommand, defineEvent, defineModal } from "strife.js";
import constants from "../../common/constants.js";
import { persistedLeave, persistedRejoin } from "./persisted.js";
import {
	createCustomRole,
	deleteMemberRoles,
	recheckMemberRole,
	recheckAllRoles,
	customRole,
} from "./custom.js";

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

defineEvent("guildMemberRemove", persistedLeave);

defineEvent("guildMemberAdd", persistedRejoin);

defineEvent("guildMemberUpdate", async (_, member) => {
	if (member.guild.id !== config.guild.id) return;

	if (member.roles.premiumSubscriberRole && config.roles.booster)
		await member.roles.add(config.roles.booster, "Boosted the server");
});

defineCommand(
	{ name: "custom-role", description: "Create a custom role for yourself", restricted: true },
	customRole,
);

defineModal("customRole", createCustomRole);

defineEvent("guildMemberRemove", deleteMemberRoles);

defineEvent("guildMemberUpdate", recheckMemberRole);

defineEvent("applicationCommandPermissionsUpdate", recheckAllRoles);
