import CONSTANTS from "../common/CONSTANTS.js";
import Database from "../common/database.js";

import type Event from "../common/types/event";
import type { Snowflake } from "discord.js";

export const rolesDatabase = new Database<{ [role: Snowflake]: true } & { user: Snowflake }>(
	"roles",
);
await rolesDatabase.init();

const event: Event<"guildMemberAdd"> = async function event(member) {
	if (member.guild.id !== CONSTANTS.guild.id) return;

	// todo
	// const allRoles = [...(rolesDatabase.data)];
	// const databaseIndex = allRoles.findIndex((entry) => entry.user === member.id);

	// const memberRoles = Object.fromEntries(
	// 	member.roles
	// 		.valueOf()
	// 		.filter(
	// 			(role) =>
	// 				role.editable &&
	// 				role.id !== CONSTANTS.guild.id &&
	// 				![CONSTANTS.roles.active?.id, CONSTANTS.roles.weekly_winner?.id].includes(
	// 					role.id,
	// 				),
	// 		)
	// 		.map((role) => [role.id, true] as const),
	// );

	// if (databaseIndex === -1) allRoles.push({ user: member.id, ...memberRoles });
	// else allRoles[databaseIndex] = { ...allRoles[databaseIndex], ...memberRoles, user: member.id };

	// rolesDatabase.data = allRoles;
};
export default event;
// todo save roles in the db
