import { ChannelType, type NonThreadGuildBasedChannel } from "discord.js";
import constants from "./constants.js";
import { client } from "../lib/client.js";

const guild = await client.guilds.fetch(process.env.GUILD_ID ?? "");

async function getConfig() {
	const channels = await guild.channels.fetch();
	const roles = await guild.roles.fetch();

	const latestRelease: string =
		process.env.NODE_ENV == "production"
			? (
					await fetch(
						`https://api.github.com/repos/${constants.urls.saRepo}/releases/latest`,
					).then(async (res) => await res.json<any>())
			  ).tag_name
			: "master";

	return {
		roles: {
			admin: roles.find((role) => role.name.toLowerCase().includes("admin")),
			mod: roles.find((role) => role.name.toLowerCase().includes("mod")),
			weekly_winner: roles.find((role) => role.name.toLowerCase().includes("weekly")),
			epic: roles.find((role) => role.name.toLowerCase().includes("epic")),
			booster: roles.find(
				(role) => role.editable && role.name.toLowerCase().includes("booster"),
			),
			active: roles.find(
				(role) => role.editable && role.name.toLowerCase().includes("active"),
			),
		},

		urls: {
			saSource: `https://raw.githubusercontent.com/${constants.urls.saRepo}/${latestRelease}`,
			latestRelease,
		},

		channels: {
			info: getChannel("Info", ChannelType.GuildCategory, "start"),
			announcements:
				guild.systemChannel || getChannel("server", ChannelType.GuildText, "start"),
			tickets: getChannel("contact", ChannelType.GuildText, "start"),
			board: getChannel(
				"board",
				[ChannelType.GuildText, ChannelType.GuildAnnouncement],
				"end",
			),
			welcome: getChannel("welcome", ChannelType.GuildText),

			mod: getChannel("mod-talk", ChannelType.GuildText),
			modlogs: guild.publicUpdatesChannel || getChannel("logs", ChannelType.GuildText, "end"),
			exec: getChannel("exec", ChannelType.GuildText, "start"),
			admin: getChannel("admin", ChannelType.GuildText, "start"),

			general: getChannel("general", ChannelType.GuildText),

			updates: getChannel("updates", ChannelType.GuildText, "partial"),
			suggestions: getChannel("suggestions", ChannelType.GuildForum),
			bugs: getChannel("bug", ChannelType.GuildForum, "start"),

			bots: getChannel("bots", ChannelType.GuildText, "partial"),

			advertise:
				getChannel("advertise", ChannelType.GuildText, "partial") ||
				getChannel("promo", ChannelType.GuildText, "partial"),

			old_suggestions: getChannel("suggestions", ChannelType.GuildText, "partial"),
		},

		guild,
	};

	function getChannel<T extends ChannelType>(
		name: string,
		type: T | T[] = [],
		matchType: "end" | "full" | "partial" | "start" = "full",
	): (NonThreadGuildBasedChannel & { type: T }) | undefined {
		const types = [type].flat() as ChannelType[];
		return channels.find((channel): channel is typeof channel & { type: T } => {
			if (!channel || !types.includes(channel.type)) return false;

			switch (matchType) {
				case "full":
					return channel.name === name;
				case "partial":
					return channel.name.includes(name);
				case "start":
					return channel.name.startsWith(name);
				case "end":
					return channel.name.endsWith(name);
			}
		});
	}
}

const config = await getConfig();
export async function syncConfig() {
	const newConfig = await getConfig();
	config.roles = newConfig.roles;
	config.urls = newConfig.urls;
	config.channels = newConfig.channels;
}
export default config;
