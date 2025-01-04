import type { GuildMember, PartialGuildMember } from "discord.js";



import mongoose from "mongoose";



import config from "../../common/config.ts";


export const PERSISTED_ROLES = {
	designer: "916020774509375528",
	scradd: "1008190416396484700",
	admin: ["1069776422467555328", "806603332944134164"],
	mod: ["881623848137682954", "1142512540342046831"],
	dev: "806608777835053098",
	translator: "841696608592330794",
	contributor: "991413187427700786",
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

export async function persistedLeave(member: GuildMember | PartialGuildMember): Promise<void> {
	if (member.guild.id !== config.guild.id) return;

	const roles = Object.fromEntries(
		Object.entries(PERSISTED_ROLES).map(([key, ids]) => [
			key,
			[ids].flat().some((id) => member.roles.resolve(id)),
		]),
	);
	await RoleList.findOneAndUpdate({ id: member.id }, roles, {
		upsert: Object.values(roles).includes(true),
	}).exec();
}

export async function persistedRejoin(member: GuildMember): Promise<void> {
	if (member.guild.id !== config.guild.id) return;

	if (member.user.bot) await member.roles.add("806609992597110825", "Is bot");

	const memberRoles = await RoleList.findOneAndDelete({ id: member.id }).exec();
	if (!memberRoles) return;
	for (const roleName of Object.keys(PERSISTED_ROLES)) {
		const [role] = [PERSISTED_ROLES[roleName]].flat();
		if (memberRoles[roleName] && role) await member.roles.add(role, "Persisting roles");
	}
}
