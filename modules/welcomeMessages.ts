import { Collection, Snowflake } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import defineEvent from "../events.js";
import { nth } from "../util/numbers.js";

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== CONSTANTS.guild.id) return;

	const greetings = [
		`Everybody please welcome ${member.toString()} to ${
			CONSTANTS.guild.name
		}; they’re our ${nth(CONSTANTS.guild.memberCount)} member!`,
		`A big shoutout to ${member.toString()}, we’re glad you’ve joined us as our ${nth(
			CONSTANTS.guild.memberCount,
		)} member!`,
		`Here we go again… ${member.toString()} is here, our ${nth(
			CONSTANTS.guild.memberCount,
		)} member!`,
		`||Do I always have to let you know when there is a new member?|| ${member.toString()} is here (our ${nth(
			CONSTANTS.guild.memberCount,
		)})!`,
		`Is it a bird? Is it a plane? No, it’s ${member.toString()}, our ${nth(
			CONSTANTS.guild.memberCount,
		)} member!`,
		`Welcome:tm: ${member.toString()}! You’re our ${nth(CONSTANTS.guild.memberCount)} member!`,
	];

	await CONSTANTS.channels.welcome?.send(
		`${CONSTANTS.emojis.misc.join} ${
			greetings[Math.floor(Math.random() * greetings.length)] ?? ""
		}${
			String(CONSTANTS.guild.memberCount).includes("87")
				? " (WAS THAT THE BITE OF 87?!?!?)"
				: ""
		}`,
	);
});

defineEvent("guildMemberRemove", async (member) => {
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
});

defineEvent("guildMemberAdd", async () => {
	// TODO: when an invite is deleted, store its info in a db so it can be read in the future
	const inviters = (await CONSTANTS.guild.invites.fetch()).reduce((accumulator, invite) => {
		const inviter = invite.inviter?.id ?? "";
		accumulator.set(inviter, (accumulator.get(inviter) ?? 0) + (invite.uses ?? 0));
		return accumulator;
	}, new Collection<Snowflake, number>());
	inviters.map(async (count, user) => {
		if (count < 20) return;
		const inviter = await CONSTANTS.guild.members.fetch(user).catch(() => {});
		if (
			!inviter ||
			inviter.id === "279855717203050496" ||
			inviter.user.bot ||
			!CONSTANTS.roles.epic ||
			inviter.roles.resolve(CONSTANTS.roles.epic.id)
		)
			return;
		await inviter.roles.add(CONSTANTS.roles.epic, "Invited 20+ people");
		await CONSTANTS.channels.general?.send(
			`🎊 ${inviter.toString()} Thanks for inviting 20+ people! Here’s ${CONSTANTS.roles.epic.toString()} as a thank-you.`,
		);
	});
});
defineEvent("guildMemberAdd", async () => {
	await CONSTANTS.channels.info?.setName(
		`Info - ${(
			CONSTANTS.guild.memberCount - (CONSTANTS.guild.memberCount > 1_005 ? 5 : 0)
		).toLocaleString([], {
			compactDisplay: "short",
			maximumFractionDigits: 2,
			minimumFractionDigits: CONSTANTS.guild.memberCount > 1_000 ? 2 : 0,
			notation: "compact",
		})} members`,
		"Member joined",
	);
});
