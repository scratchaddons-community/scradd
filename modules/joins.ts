import { AuditLogEvent } from "discord.js";
import Mustache from "mustache";
import { client, defineEvent } from "strife.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import { bans, joins, leaves } from "../common/strings.js";
import { nth } from "../util/numbers.js";
import { getMessageJSON } from "../util/discord.js";

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	const countString = config.guild.memberCount.toString();
	const jokes = /^[1-9]0+$/.test(countString)
		? ` (${"🥳".repeat(countString.length - 1)})`
		: countString.includes("69")
		? " (nice)"
		: countString.endsWith("87")
		? ` (WAS THAT THE BITE OF ’87${"⁉".repeat(Math.ceil(countString.length / 2))})`
		: "";
	const memberCount = nth(config.guild.memberCount) + jokes;

	const greeting = joins[Math.floor(Math.random() * joins.length)] ?? joins[0];
	await config.channels.welcome?.send(
		`${constants.emojis.welcome.join} ${Mustache.render(greeting, {
			MEMBER: member.toString(),
			COUNT: memberCount,
			RAW_COUNT: config.guild.memberCount.toString(),
			RAW_JOKES: jokes,
		})}`,
	);
});
defineEvent("guildMemberRemove", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	const auditLogs = await config.guild
		.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick })
		.catch(() => void 0);
	const kicked = auditLogs?.entries.first()?.target?.id === member.id;
	const banned = await config.guild.bans.fetch(member).catch(() => void 0);

	const byes = banned || kicked ? bans : leaves;
	const bye = byes[Math.floor(Math.random() * byes.length)] ?? byes[0];

	await config.channels.welcome?.send(
		`${constants.emojis.welcome[banned ? "ban" : "leave"]} ${Mustache.render(bye, {
			MEMBER: member.user.displayName,
		})}`,
	);
});

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;
	await config.channels.info?.setName(
		`Info - ${(
			config.guild.memberCount - (config.guild.memberCount > 1005 ? 5 : 0)
		).toLocaleString([], {
			compactDisplay: "short",
			maximumFractionDigits: 1,
			minimumFractionDigits: config.guild.memberCount > 1000 ? 1 : 0,
			notation: "compact",
		})} members`,
		`${member.user.tag} joined the server`,
	);
});

let introCount = 0;
let introTemplate =
	(await config.channels.intros?.messages.fetch())?.find(
		(message) =>
			message.author.id === client.user.id &&
			message.embeds[0]?.title === "Introduction Template",
	) ??
	(await config.channels.intros?.send({
		embeds: [
			{
				title: "Introduction Template",
				color: constants.themeColor,
				description:
					"```md\n- Name/Nickname: \n- Pronouns: \n- Age: \n- Scratch username: \n- Country/Location: \n- Favorite addon: \n- Hobbies: \n- Extra: \n```",
			},
		],
	}));
defineEvent("messageCreate", async (message) => {
	if (message.channel.id !== config.channels.intros?.id) return;

	introCount++;
	if (introCount % 5) return;

	const newTemplate = await introTemplate?.reply(getMessageJSON(introTemplate));
	await introTemplate?.delete();
	introTemplate = newTemplate;
});
