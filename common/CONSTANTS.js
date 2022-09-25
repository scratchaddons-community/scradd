import { ChannelType } from "discord.js";
import fetch from "node-fetch";
import client, { guild } from "../client.js";

const channels = await guild.channels.fetch();
const roles = await guild.roles.fetch();

const saRepo = "ScratchAddons/ScratchAddons";
/** @type {string} */
const latestRelease =
	process.env.NODE_ENV == "production"
		? /** @type {any} */ (
				await fetch(`https://api.github.com/repos/${saRepo}/releases/latest`).then((res) =>
					res.json(),
				)
		  ).tag_name
		: "master";

export default /** @type {const} */ ({
	collectorTime: 45_000,
	zeroWidthSpace: "\u200b",
	emojis: {
		statuses: { yes: "<:yes:1016127835217334322>", no: "<:no:1016127863273037935>" },
		autoreact: {
			jeffalo: "<:jeffalo:1019771285850554419>",
			tw: "<:tw:1019771807450026084>",
			e: "<:e_:939986562937151518>",
			griffpatch: "<:griffpatch:938441399936909362>",
			sus: "<:sus:938548233385414686>",
			appel: "<:appel:938818517535440896>",
			cubot: "<:cubot:939336981601722428>",
			tera: "<:tewwa:938486033274785832>",
			rick: "<a:rick:962421165295554601>",
			sxd: "<:sxd:962798819572056164>",
			nope: "<a:nope:947888617953574912>",
			soa: [
				"<:soa1:939336189880713287>",
				"<:soa2:939336229449789510>",
				"<:soa3:939336281454936095>",
			],
			snakes: [
				"<:snakes1:962795689660788819>",
				"<:snakes2:962795778638762004>",
				"<:snakes3:962800682061140019>",
			],
			bob: "<:bob:1001977844894810243>",
		},
		discord: {
			reply: "<:reply:953046345214750720>",
			error: "<:error:949439327413358602>",
			add: "<:add:938441019278635038>",
			remove: "<:remove:947707131879104554>",
			edit: "<:edit:938441054716297277>",
			pin: "<:pin:938441100258070568>",
			boost: "<:boost:938441038756986931>",
			thread: "<:thread:938441090657296444>",
			typing: "<a:typing:949436374174560276>",
			call: "<:call:950438678361161738>",
		},
		misc: { addon: "<:addon:1008842100764332142>", percent: "<:percent:1009144273331040296>" },
	},
	robotop: "323630372531470346",
	testingServer: await client.guilds.fetch("938438560925761619").catch(() => {}),
	roles: {
		designers: "966174686142672917",
		developers: "938439909742616616",
		testers: "938440159102386276",
		mod: roles.find((role) => role.name.toLowerCase().includes("mod")),
		dev: roles.find((role) => role.name.toLowerCase().includes("devs")),
		epic: roles.find((role) => role.name.toLowerCase().includes("epic")),
		weekly_winner: roles.find((role) => role.name.toLowerCase().includes("weekly")),
	},
	urls: {
		usercountJson: "https://scratchaddons.com/usercount.json",
		saSource: "https://raw.githubusercontent.com/ScratchAddons/ScratchAddons/" + latestRelease,
		saRepo,
		latestRelease,
		addonImageRoot: "https://scratchaddons.com/assets/img/addons",
		settingsPage: "https://scratch.mit.edu/scratch-addons-extension/settings",
	},
	themeColor: process.env.NODE_ENV === "production" ? 0xff7b26 : 0x175ef8,
	footerSeperator: " • ",
	webhookName: "scradd-webhook",
	channels: {
		info: enforceChannelType(
			channels.find((channel) => !!channel?.name.startsWith("📜")),
			ChannelType.GuildCategory,
		),
		board: enforceChannelType(
			channels.find((channel) => !!channel?.name.endsWith("board")),
			[ChannelType.GuildText, ChannelType.GuildAnnouncement],
		),
		airport:
			guild.systemChannel ||
			enforceChannelType(
				channels.find((channel) => "airport" === channel?.name),
				ChannelType.GuildText,
			),
		mod:
			guild.publicUpdatesChannel ||
			enforceChannelType(
				channels.find((channel) => "mod-talk" === channel?.name),
				ChannelType.GuildText,
			),
		modlogs: enforceChannelType(
			channels.find((channel) => !!channel?.name.endsWith("logs")),
			ChannelType.GuildText,
		),
		admin: enforceChannelType(
			channels.find((channel) => !!channel?.name.includes("admin")),
			ChannelType.GuildText,
		),
		modmail: enforceChannelType(
			channels.find((channel) => "modmail" === channel?.name),
			ChannelType.GuildText,
		),
		devs: enforceChannelType(
			channels.find((channel) => !!channel?.name.includes("devs")),
			ChannelType.GuildText,
		),
		boosters: enforceChannelType(
			channels.find((channel) => !!channel?.name.includes("boosters")),
			ChannelType.GuildText,
		),
		youTube: enforceChannelType(
			channels.find((channel) => !!channel?.name.includes("youtube")),
			ChannelType.GuildText,
		),
		chat: enforceChannelType(
			channels.find((channel) => !!channel?.name.startsWith("💬")),
			ChannelType.GuildCategory,
		),
		general: enforceChannelType(
			channels.find((channel) => "general" === channel?.name),
			ChannelType.GuildText,
		),
		suggestions: enforceChannelType(
			channels.find((channel) => "suggestions" === channel?.name),
			ChannelType.GuildText,
		),
		bots: enforceChannelType(
			channels.find((channel) => !!channel?.name.endsWith("bots")),
			ChannelType.GuildText,
		),
		advertise: enforceChannelType(
			channels.find((channel) => "advertise" === channel?.name),
			ChannelType.GuildText,
		),
	},
});

/**
 * @template {ChannelType} T
 *
 * @param {import("discord.js").NonThreadGuildBasedChannel | undefined | null} channel
 * @param {T | T[]} type
 *
 * @returns {(import("discord.js").NonThreadGuildBasedChannel & { type: T }) | undefined}
 */
function enforceChannelType(channel, type) {
	const types = [type].flat();
	// @ts-expect-error -- This is correct.
	return types.includes(channel?.type) ? channel : undefined;
}
