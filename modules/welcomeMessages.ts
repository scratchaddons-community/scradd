import { Collection, Snowflake } from "discord.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import defineEvent from "../lib/events.js";
import { nth } from "../util/numbers.js";

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	const greetings = [
		`Everybody please welcome ${member.toString()} to ${config.guild.name}; they’re our ${nth(
			config.guild.memberCount,
		)} member!`,
		`A big shoutout to ${member.toString()}, we’re glad you’ve joined us as our ${nth(
			config.guild.memberCount,
		)} member!`,
		`Here we go again… ${member.toString()} is here, our ${nth(
			config.guild.memberCount,
		)} member!`,
		`||Do I always have to let you know when there is a new member?|| ${member.toString()} is here (our ${nth(
			config.guild.memberCount,
		)})!`,
		`Is it a bird? Is it a plane? No, it’s ${member.toString()}, our ${nth(
			config.guild.memberCount,
		)} member!`,
		`Welcome:tm: ${member.toString()}! You’re our ${nth(config.guild.memberCount)} member!`,
	];

	await config.channels.welcome?.send(
		`${constants.emojis.misc.join} ${
			greetings[Math.floor(Math.random() * greetings.length)] ?? ""
		}${
			String(config.guild.memberCount).includes("87") ? " (WAS THAT THE BITE OF 87?!?!?)" : ""
		}`,
	);
});

defineEvent("guildMemberRemove", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	const banned = await config.guild.bans.fetch(member).catch(() => {});

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

	await config.channels.welcome?.send(
		`${constants.emojis.misc[banned ? "ban" : "leave"]} ${
			byes[Math.floor(Math.random() * byes.length)]
		}`,
	);
});

defineEvent("guildMemberAdd", async () => {
	await config.channels.info?.setName(
		`Info - ${(
			config.guild.memberCount - (config.guild.memberCount > 1_005 ? 5 : 0)
		).toLocaleString([], {
			compactDisplay: "short",
			maximumFractionDigits: 2,
			minimumFractionDigits: config.guild.memberCount > 1_000 ? 2 : 0,
			notation: "compact",
		})} members`,
		"Member joined",
	);
});
