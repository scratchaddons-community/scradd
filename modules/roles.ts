import config from "../common/config.js";
import Database from "../common/database.js";

import { Collection, type Snowflake } from "discord.js";
import defineEvent from "../lib/events.js";

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
			inviter.id === "279855717203050496" ||
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
