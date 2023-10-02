import type { GuildMember, PartialGuildMember, Snowflake } from "discord.js";
import config from "../../common/config.js";
import Database from "../../common/database.js";

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
	formerAdmin: ["1069776422467555328", "806603332944134164"],
	formerMod: ["881623848137682954", config.roles.mod?.id],
	dev: "806608777835053098",
	translator: "841696608592330794",
	contributor: config.roles.dev?.id,
	epic: config.roles.epic?.id,
	booster: config.roles.booster?.id,
	og: "1107170572963684402",
} as const;

export function persistedLeave(member: PartialGuildMember | GuildMember) {
	if (member.guild.id !== config.guild.id) return;

	const memberRoles = {
		id: member.id,
		...Object.fromEntries(
			Object.entries(persistedRoles).map(([key, ids]) => [
				key,
				[ids].flat().some((id) => id && member.roles.resolve(id)),
			]),
		),
	};

	if (!Object.values(memberRoles).includes(false)) return;
	rolesDatabase.updateById(memberRoles, {});
}

export async function persistedRejoin(member: GuildMember) {
	if (member.guild.id !== config.guild.id) return;

	const memberRoles = rolesDatabase.data.find((entry) => entry.id === member.id);
	for (const roleName of Object.keys(persistedRoles)) {
		const role = [persistedRoles[roleName]].flat()[0];
		if (memberRoles?.[roleName] && role) await member.roles.add(role, "Persisting roles");
	}
}
