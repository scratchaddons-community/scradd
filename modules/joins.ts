import { AuditLogEvent, ButtonStyle, ComponentType, channelLink } from "discord.js";
import Mustache from "mustache";
import { client, defineEvent } from "strife.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import { bans, joins, leaves } from "../common/strings.js";
import { nth } from "../util/numbers.js";

const directoryUrl =
	config.channels.servers ? `${config.channels.servers.url}/${config.channels.servers.id}` : "";

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;
	await member
		.send({
			embeds: [
				{
					color: constants.themeColor,
					url: constants.domains.scratchAddons,
					title: "Welcome to the __Scratch Addons__ Discord server!",
					description: "Thank you for joining the Scratch Addons community!",
					fields: [
						{
							name: "**What is this server?**",
							value:
								`This is *the largest [Scratch](${constants.domains.scratch}) server*!` +
								` Check out some of our funniest and most memorable moments${config.channels.board ? ` on the ${config.channels.board.toString()}` : ""} and introduce yourself${config.channels.intros ? ` in ${config.channels.intros.toString()}` : ""}.` +
								(directoryUrl &&
									` You can also check out our [server directory](<${directoryUrl}>) for other large Scratch servers to chat in.`),
						},
						{
							name: "**What is Scratch Addons?**",
							value:
								"This server focuses specifically on *the Scratch Addons browser extension*, the all-in-one browser extension for Scratch." +
								" Scratch Addons combines new and existing features and themes for the Scratch website and project editor into one __easy-to-access and configurable__ browser extension." +
								` For more information about us, **visit [ScratchAddons.com](${constants.domains.scratchAddons})**.`,
						},
						{
							name: "**We are not the Scratch Team.**",
							value:
								"Please know that *nobody here is a Scratch developer or moderator*, we’re just some people who like to code, like you!" +
								` If you wish to contact the ST, please use [Contact Us](<${constants.domains.scratch}/contact-us>).` +
								" **No official Scratch server exists**, but please feel free to socialize with other Scratchers here.",
						},
					],
					footer: {
						icon_url: `https://raw.githubusercontent.com/${constants.repos.scratchAddons}/master/images/icon.png`,
						text: "~ the Scratch Addons team",
					},
					image: { url: `${constants.domains.scradd}/images/join-dm-1.png` },
				},
				{
					url: constants.domains.scratchAddons,
					image: { url: `${constants.domains.scradd}/images/join-dm-2.png` },
				},
				{
					url: constants.domains.scratchAddons,
					image: { url: `${constants.domains.scradd}/images/join-dm-3.png` },
				},
				{
					url: constants.domains.scratchAddons,
					image: { url: `${constants.domains.scradd}/images/join-dm-4.png` },
				},
			],
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							url: constants.domains.scratchAddons,
							style: ButtonStyle.Link,
							type: ComponentType.Button,
							label: "Get Scratch Addons",
						},
						{
							url: config.guild.rulesChannel?.url ?? channelLink("", config.guild.id),
							style: ButtonStyle.Link,
							type: ComponentType.Button,
							label: "Server Rules",
						},
						{
							url: directoryUrl || channelLink("", config.guild.id),
							style: ButtonStyle.Link,
							type: ComponentType.Button,
							label: "Other Scratch Servers",
						},
					],
				},
			],
		})
		.catch(() => void 0);
});

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	const countString = config.guild.memberCount.toString();
	const jokes =
		/^[1-9]0+$/.test(countString) ? ` (${"🥳".repeat(countString.length - 1)})`
		: countString.includes("69") ? " (nice)"
		: countString.endsWith("87") ?
			` (WAS THAT THE BITE OF ’87${"⁉".repeat(Math.ceil(countString.length / 2))})`
		:	"";
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
		`Info - ${config.guild.memberCount.toLocaleString([], {
			compactDisplay: "short",
			maximumFractionDigits: 1,
			minimumFractionDigits: config.guild.memberCount > 1000 ? 1 : 0,
			notation: "compact",
		})} members`,
		`${member.user.tag} joined the server`,
	);
});

const INTRO_INTERVAL = 10;
let introCount = 0;
const introTemplate = {
	embeds: [
		{
			title: "Introduction Template",
			color: constants.themeColor,
			description: `\`\`\`md\n- Name/Nickname: \n- Pronouns: \n- Age: \n- Scratch profile: ${constants.domains.scratch}/users/\n- Country/Location: \n- Favorite addon: \n- Hobbies: \n- Extra: \n\`\`\``,
		},
	],
};
let templateMessage =
	(await config.channels.intros?.messages.fetch({ limit: 100 }))?.find(
		(message) =>
			message.author.id === client.user.id &&
			message.embeds[0]?.title === "Introduction Template",
	) ?? (await config.channels.intros?.send(introTemplate));
defineEvent("messageCreate", async (message) => {
	if (message.channel.id !== config.channels.intros?.id) return;

	introCount++;
	if (introCount % INTRO_INTERVAL) return;

	const newMessage = await templateMessage?.reply(introTemplate);
	await templateMessage?.delete();
	templateMessage = newMessage;
});
