import mongoose from "mongoose";
import { client, defineEvent } from "strife.js";

const guild = await client.guilds.fetch("806602307750985799").catch(() => void 0);

export const PERSISTED_ROLES = {
	support: "1323130397349118013",
	team: "1266072944858238986",
	admin: "1069776422467555328",
	mod: "881623848137682954",
	dev: "806608777835053098",
	translator: "841696608592330794",
	contributor: "991413187427700786",
	scradd: "1008190416396484700",
	designer: "916020774509375528",
	weekly: "1020369115875127408",
	epic: "832640139108679681",
	booster: "1042315414128037888",
	og: "1107170572963684402",
} as const;
export const RoleList = mongoose.model(
	"RoleList",
	new mongoose.Schema({
		id: String,
		...Object.fromEntries(Object.keys(PERSISTED_ROLES).map((role) => [role, Boolean])),
	}),
);

defineEvent("guildMemberRemove", async (member) => {
	if (member.guild.id !== guild?.id) return;

	const roles = Object.fromEntries(
		Object.entries(PERSISTED_ROLES).map(([key, id]) => [key, !!member.roles.resolve(id)]),
	);
	await RoleList.findOneAndUpdate({ id: member.id }, roles, {
		upsert: Object.values(roles).includes(true),
	}).exec();
});

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== guild?.id) return;

	if (member.user.bot) await member.roles.add("806609992597110825", "Is bot");

	const memberRoles = await RoleList.findOneAndDelete({ id: member.id }).exec();
	if (!memberRoles) return;
	for (const roleName of Object.keys(PERSISTED_ROLES))
		if (memberRoles[roleName])
			await member.roles.add(PERSISTED_ROLES[roleName], "Persisting roles");
});
