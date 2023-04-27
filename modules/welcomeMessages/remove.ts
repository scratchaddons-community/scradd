import CONSTANTS from "../../../common/CONSTANTS.js";
import type Event from "../../../common/types/event";

const event: Event<"guildMemberAdd"> = async function event(member) {
	if (member.guild.id !== CONSTANTS.guild.id) return;

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

};
export default event;
