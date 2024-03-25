import { AuditLogEvent, ButtonStyle, ComponentType } from "discord.js";
import Mustache from "mustache";
import { client, defineEvent } from "strife.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import { bans, joins, leaves } from "../common/strings.js";
import { nth } from "../util/numbers.js";
import { getMessageJSON } from "../util/discord.js";

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;
	await member.send({
		embeds: [
			{
				color: constants.themeColor,
				url: "https://scratchaddons.com",
				title: "Welcome to the __Scratch Addons__ Discord server!",
				description: "Thank you for joining the Scratch Addons community!",
				fields: [
					{
						name: "**What is this server?**",
						value: "This is *the largest [Scratch](<https://scratch.mit.edu>) server*! Check out some of our funniest and most memorable moments on the <#938809898660155453> and introduce yourself in <#1109345462609252362>. You can also check out our [server directory](<https://discord.com/channels/806602307750985799/874743757210275860/1211864187458814024>) for other large Scratch servers to chat in.",
					},
					{
						name: "**What is Scratch Addons?**",
						value: "This server focuses specifically on *the Scratch Addons browser extension*, the all-in-one browser extension for Scratch. Scratch Addons combines new and existing features and themes for the Scratch website and project editor into one __easy-to-access and configurable__ browser extension. For more information about us, **visit [ScratchAddons.com](https://scratchaddons.com)**.",
					},
					{
						name: "**We are not the Scratch Team.**",
						value: "Please know that *nobody here is a Scratch developer or moderator*, we’re just some people who like to code, like you! If you wish to contact the ST, please use [Contact Us](<https://scratch.mit.edu/contact-us>). **No official Scratch server exists**, but please feel free to socialize with other Scratchers here.",
					},
				],
				footer: {
					icon_url:
						"https://raw.githubusercontent.com/ScratchAddons/ScratchAddons/master/images/icon.png",
					text: "~ the Scratch Addons team",
				},
				image: {
					url: "https://lh3.googleusercontent.com/LXb0DNF1Y3KykjFzjjlO_jM0xSATVBY5R5_7ReJMaRF5MXmT91F3pbYEhgOXqkIK8JAd1o4rc7y2wBtOLaMYyDhuhg=s1280-w1280-h800",
				},
			},
			{
				url: "https://scratchaddons.com",
				image: {
					url: "https://lh3.googleusercontent.com/eMZGMGH9iCgoH0Xan8-8LyZEJA8xUYTi3R6ce9g62ooItiJbnSDdYNfnbERRBYVy1ngtOYMOEBM5JGklgARsxuOg=s1280-w1280-h800",
				},
			},
			{
				url: "https://scratchaddons.com",
				image: {
					url: "https://lh3.googleusercontent.com/GSmVea4k80y1FzuQbE7Pbhe54wWtBuWayvatN8RXgTK0H8UVxtRzzHu-q8Ec01NJ3nVi5O4ubC1xS6LGsLwCFsaSkw=s1280-w1280-h800",
				},
			},
			{
				url: "https://scratchaddons.com",
				image: {
					url: "https://lh3.googleusercontent.com/fArkWY45FMjB-8MybIXt2u0g5g-8HF0gPf5T6GWHiMYkgqPQ67D43iIFY-TXOnSSj9Auctke0upALUdv82_6uhedaQ=s1280-w1280-h800",
				},
			},
		],
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						url: "https://scratchaddons.com",
						style: ButtonStyle.Link,
						type: ComponentType.Button,
						label: "Get Scratch Addons",
					},
					{
						url: "https://discord.com/channels/806602307750985799/806603924613627914",
						style: ButtonStyle.Link,
						type: ComponentType.Button,
						label: "Server Rules",
					},
					{
						url: "https://discord.com/channels/806602307750985799/874743757210275860/1211864187458814024",
						style: ButtonStyle.Link,
						type: ComponentType.Button,
						label: "Other Scratch Servers",
					},
				],
			},
		],
	});
});

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
			RAW_COUNT: countString,
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

const INTRO_INTERVAL = 5;
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
					"```md\n- Name/Nickname: \n- Pronouns: \n- Age: \n- Scratch profile: https://scratch.mit.edu/users/\n- Country/Location: \n- Favorite addon: \n- Hobbies: \n- Extra: \n```",
			},
		],
	}));
defineEvent("messageCreate", async (message) => {
	if (message.channel.id !== config.channels.intros?.id) return;

	introCount++;
	if (introCount % INTRO_INTERVAL) return;

	const newTemplate = await introTemplate?.reply(getMessageJSON(introTemplate));
	await introTemplate?.delete();
	introTemplate = newTemplate;
});
