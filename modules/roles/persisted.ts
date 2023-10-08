import type { GuildMember, PartialGuildMember } from "discord.js";
import config from "../../common/config.js";
import mongoose from "mongoose";

const persistedRoles = {
	designer: "916020774509375528",
	scradd: "1008190416396484700",
	admin: ["1069776422467555328", "806603332944134164"],
	mod: ["881623848137682954", config.roles.mod?.id],
	dev: "806608777835053098",
	translator: "841696608592330794",
	contributor: config.roles.dev?.id,
	epic: config.roles.epic?.id,
	booster: config.roles.booster?.id,
	og: "1107170572963684402",
} as const;

const rolesSchema = new mongoose.Schema({
	id: String,
	...Object.fromEntries(Object.keys(persistedRoles).map((role) => [role, Boolean])),
});
const RoleList = mongoose.model("RoleList", rolesSchema);

export async function persistedLeave(member: PartialGuildMember | GuildMember) {
	if (member.guild.id !== config.guild.id) return;

	const roles = Object.fromEntries(
		Object.entries(persistedRoles).map(([key, ids]) => [
			key,
			[ids].flat().some((id) => id && member.roles.resolve(id)),
		]),
	);
	await RoleList.findOneAndUpdate({ id: member.id }, roles, {
		upsert: Object.values(roles).includes(true),
	});
}

export async function persistedRejoin(member: GuildMember) {
	if (member.guild.id !== config.guild.id) return;

	const memberRoles = await RoleList.findOneAndDelete({ id: member.id });
	for (const roleName of Object.keys(persistedRoles)) {
		const role = [persistedRoles[roleName]].flat()[0];
		if (memberRoles?.[roleName] && role) await member.roles.add(role, "Persisting roles");
	}
}
