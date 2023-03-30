import CONSTANTS from "../../../common/CONSTANTS.js";
import Database from "../../../common/database.js";
import log from "../../../common/logging.js";
import { getThreadFromMember } from "../../../common/contactMods.js";

import type Event from "../../../common/types/event";
import type { Snowflake } from "discord.js";

export const rolesDatabase = new Database<{ [role: Snowflake]: true } & { user: Snowflake }>(
	"roles",
);
await rolesDatabase.init();

const event: Event<"guildMemberAdd"> = async function event(member) {
	if (member.guild.id !== CONSTANTS.guild.id) return;
	await log(`💨 Member ${member.toString()} left!`, "members");

	const banned = await CONSTANTS.guild.bans.fetch(member).catch(() => {});

	const byes = banned
		? [
				`Oof… **${member.user.username}** got banned…`,
				`There’s no turning back for **${member.user.username}**…`,
				`I don’t think this was the best place for **${member.user.username}**…`,
				`Oop, **${member.user.username}** angered the mods!`,
				`**${member.user.username}** broke the rules and took an 🇱`,
				`**${member.user.username}** talked about opacity slider too much.`,
		  ]
		: [
				`Welp… **${member.user.username}** decided to leave… what a shame…`,
				`Ahh… **${member.user.username}** left us… hope they’ll have safe travels!`,
				`There goes another, bye **${member.user.username}**!`,
				`Oop, **${member.user.username}** left… will they ever come back?`,
				`Can we get an F in the chat for **${member.user.username}**? They left!`,
				`Ope, **${member.user.username}** got eaten by an evil kumquat and left!`,
		  ];

	await CONSTANTS.channels.welcome?.send(
		`${CONSTANTS.emojis.misc[banned ? "ban" : "leave"]} ${
			byes[Math.floor(Math.random() * byes.length)]
		}`,
	);
	await getThreadFromMember(member).then(async (thread) => {
		await thread?.setArchived(true, "Member left");
	});

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
