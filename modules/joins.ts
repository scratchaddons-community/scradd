import { AuditLogEvent, ButtonStyle, channelLink, ComponentType } from "discord.js";
import Mustache from "mustache";
import { defineEvent } from "strife.js";

import config from "../common/config.ts";
import constants from "../common/constants.ts";
import { bans, joins, leaves } from "../common/strings.ts";
import { nth } from "../util/numbers.ts";

const directoryUrl =
	config.channels.servers ? `${config.channels.servers.url}/${config.channels.servers.id}` : "";

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;
	await member
		.send({
			content:
				"# Unfortunately, this server is currently in the process of shutting down.\n" +
				"### Channels will be archived one-by-one, but archive will remain publically available.\n" +
				"### Scratch Addons announcements as well as one-on-one spport will also continue to be provided.\n" +
				"## The server will be fully archived on January 3rd, 2025.\n" +
				"[More information](https://discord.com/channels/806602307750985799/806605043817644074/1312176716571217953)",
			embeds: [
				{
					color: constants.themeColor,
					url: constants.domains.scratchAddons,
					description:
						"### Welcome to the __Scratch Addons__ Discord server!\n" +
						`Thank you, ${member.toString()}, for joining the Scratch Addons community!`,
					fields: [
						{
							name: "**What is Scratch Addons?**",
							value:
								"Scratch Addons is the *all-in-one browser extension for Scratch*." +
								` Scratch Addons combines new and existing features and themes for [the Scratch website and project editor](${
									constants.domains.scratch
								}) into one __easy-to-access and configurable__ browser extension.` +
								` For more information about us, **visit [ScratchAddons.com](${
									constants.domains.scratchAddons
								})**.` +
								` If you have any questions about or issues with Scratch Addons, please ask in ${
									config.channels.support?.toString() ?? "our support channel"
								}!`,
						},
						{
							name: "**What is this server?**",
							value:
								`This is **[Scratch Addons](${
									constants.domains.scratchAddons
								})’s support server**. It is currently *the largest Scratch server*!` +
								` Check out some of our most memorable moments${
									config.channels.board ?
										` on the ${config.channels.board.toString()}`
									:	""
								} and introduce yourself${
									config.channels.general ?
										` in ${config.channels.general.toString()}`
									:	""
								}.` +
								(directoryUrl &&
									` You can also check out our [server directory](<${
										directoryUrl
									}>) for other large Scratch servers to chat in, including non-English servers.`),
						},
						{
							name: "**We are not the Scratch Team.**",
							value:
								"Please know that *nobody here is a Scratch developer or moderator*, we’re just some people who like to code, like you!" +
								` If you wish to contact the Scratch Team, please use [Contact Us](<${
									constants.domains.scratch
								}/contact-us>).` +
								" **No official Scratch server exists**, but please feel free to socialize with other Scratchers here.",
						},
					],
					footer: {
						icon_url: `https://raw.githubusercontent.com/${
							constants.repos.scratchAddons
						}/master/images/icon.png`,
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
