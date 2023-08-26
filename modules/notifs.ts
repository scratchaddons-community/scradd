import { defineEvent } from "strife.js";
import { truncateText } from "../util/text.js";
import { stripMarkdown } from "../util/markdown.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import { nth } from "../util/numbers.js";
import { AuditLogEvent } from "discord.js";

defineEvent("messageCreate", async (message) => {
	if (message.channel.id === config.channels.updates?.id) {
		await message.startThread({
			name: truncateText(
				stripMarkdown(message.cleanContent).split("\n")[0] || "New update!",
				50,
			),

			reason: "New upcoming update",
		});
	}
});

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	const greetings = [
		`Everybody please welcome ${member} to the server; they’re our ${nth(
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
			config.guild.memberCount.toString().includes("87")
				? " (WAS THAT THE BITE OF 87?!?!?)"
				: ""
		}`,
	);
});
defineEvent("guildMemberRemove", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	const auditLogs = await config.guild
		.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick })
		.catch(() => void 0);
	const kicked = auditLogs?.entries.first()?.target?.id === member.id;
	const banned = await config.guild.bans.fetch(member).catch(() => void 0);

	const byes =
		banned || kicked
			? [
					`Oof… **${member.user.displayName}** got ${banned ? "banned" : "kicked"}…`,
					`We don’t talk about what **${member.user.displayName}** did…`,
					`I don’t think this was the best place for **${member.user.displayName}**…`,
					`Oop, **${member.user.displayName}** angered the mods!`,
					`**${member.user.displayName}** broke the rules and took an 🇱`,
					`**${member.user.displayName}** talked about opacity slider too much.`,
			  ]
			: [
					`Welp… **${member.user.displayName}** decided to leave… what a shame…`,
					`Ahh… **${member.user.displayName}** left us… hope they’ll have safe travels!`,
					`There goes another, bye **${member.user.displayName}**!`,
					`Oop, **${member.user.displayName}** left… will they ever come back?`,
					`Can we get an F in the chat for **${member.user.displayName}**? They left!`,
					`Ope, **${member.user.displayName}** got eaten by an evil kumquat and left!`,
			  ];

	await config.channels.welcome?.send(
		`${constants.emojis.misc[banned ? "ban" : "leave"]} ${
			byes[Math.floor(Math.random() * byes.length)]
		}`,
	);
});

defineEvent("guildMemberAdd", async (member) => {
	await config.channels.info?.setName(
		`Info - ${(
			config.guild.memberCount - (config.guild.memberCount > 1005 ? 5 : 0)
		).toLocaleString("en-us", {
			compactDisplay: "short",
			maximumFractionDigits: 2,
			minimumFractionDigits: config.guild.memberCount > 1000 ? 2 : 0,
			notation: "compact",
		})} members`,
		`${member.user.tag} joined the server`,
	);
});
