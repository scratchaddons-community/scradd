import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../../common/logging.js";
import { closeModmail, getThreadFromMember } from "../../../common/modmail.js";
import type Event from "../../../common/types/event";

const event: Event<"guildMemberAdd"> = async function event(member) {
	if (member.guild.id !== CONSTANTS.guild.id) return;
	await log(`💨 Member ${member.toString()} left!`, "members");

	const banned = await CONSTANTS.guild.bans
		.fetch(member)
		.then((partialBan) => {
			if (partialBan.partial) return partialBan.fetch();
			return partialBan;
		})
		.catch(() => {});

	const byes = banned
		? [
				`Oof… **${member.user.username}** got banned…`,
				`There’s no turning back for **${member.user.username}**…`,
				`I don't think this was the best place for **${member.user.username}**…`,
				`Oop, **${member.user.username}** angered the mods!`,
				`**${member.user.username}** broke the rules and took an L`,
				`**${member.user.username}** was banned ~~(he talked about opacity slider too much)~~`,
		  ]
		: [
				`Welp… **${member.user.username}** decided to leave… what a shame…`,
				`Ahh… **${member.user.username}** left us… hope they’ll have safe travels!`,
				`There goes another, bye **${member.user.username}**!`,
				`Oop, **${member.user.username}** left… will they ever come back?`,
				`Can we get an F in the chat for **${member.user.username}**? They left!`,
				`Ope, **${member.user.username}** got eaten by an evil kumquat and left!`,
		  ];

	const promises = [
		CONSTANTS.channels.welcome?.send(byes[Math.floor(Math.random() * byes.length)] || ""),
		getThreadFromMember(member).then(async (thread) => {
			if (thread) closeModmail(thread, member.user, "Member left");
		}),
	];

	await Promise.all(promises);
};
export default event;
