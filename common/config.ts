import assert from "node:assert";
import {
	ChannelType,
	Collection,
	type AnyThreadChannel,
	type Channel,
	type NonThreadGuildBasedChannel,
	type ThreadManager,
} from "discord.js";
import { client } from "strife.js";
import { CUSTOM_ROLE_PREFIX } from "../modules/roles/misc.js";

const IS_TESTING = process.argv.some((file) => file.endsWith(".test.js"));

const guild = IS_TESTING ? undefined : await client.guilds.fetch(process.env.GUILD_ID);
if (guild && !guild.available) throw new ReferenceError("Main guild is unavailable!");

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function getConfig() {
	const channels = (await guild?.channels.fetch()) ?? new Collection();
	const roles = ((await guild?.roles.fetch()) ?? new Collection()).filter(
		(role) => role.editable && !role.name.startsWith(CUSTOM_ROLE_PREFIX),
	);

	const otherGuilds = guild && (await client.guilds.fetch());
	if (otherGuilds) otherGuilds.delete(guild.id);

	const mod = roles.find((role) => role.name.toLowerCase().startsWith("mod"));
	const staff = roles.find((role) => role.name.toLowerCase().startsWith("staff")) ?? mod;
	assert(staff);
	const exec = roles.find((role) => role.name.toLowerCase().includes("exec")) ?? staff;
	return {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		guild: guild!,
		otherGuildIds: otherGuilds ? [...otherGuilds.keys()] : [],
		testingGuild:
			guild && (await client.guilds.fetch("938438560925761619").catch(() => void 0)),
		saDevGuildId: "751206349614088204",

		channels: {
			info: getChannel("Info", ChannelType.GuildCategory, "start"),
			announcements:
				guild?.systemChannel ?? getChannel("server", ChannelType.GuildText, "start"),
			board: getChannel(
				"board",
				[ChannelType.GuildText, ChannelType.GuildAnnouncement],
				"end",
			),
			servers: getChannel("servers", ChannelType.GuildText, "end"),
			tickets: getChannel("contact", ChannelType.GuildText, "start"),
			server: "1138116320249000077",
			welcome: getChannel("welcome", ChannelType.GuildText),
			intros: getChannel("intro", ChannelType.GuildText, "partial"),

			mod: getChannel("mod-talk", ChannelType.GuildText),
			modlogs:
				guild?.publicUpdatesChannel ?? getChannel("logs", ChannelType.GuildText, "end"),
			exec: getChannel("exec", ChannelType.GuildText, "start"),
			admin: getChannel("admin", ChannelType.GuildText, "start"),

			general: getChannel("general", ChannelType.GuildText),

			support: getChannel("support", ChannelType.GuildText, "partial"),
			updates: getChannel("updates", ChannelType.GuildText, "partial"),
			suggestions: getChannel("suggestions", ChannelType.GuildForum),
			bugs: getChannel("bug", ChannelType.GuildForum, "start"),
			devs: getChannel("devs", ChannelType.GuildText, "start"),

			qotd: getChannel("question", ChannelType.GuildForum, "partial"),
			advertise:
				getChannel("advertise", ChannelType.GuildText, "partial") ??
				getChannel("promo", ChannelType.GuildText, "partial"),
			bots: getChannel("bots", ChannelType.GuildText, "partial"),

			oldSuggestions: getChannel("suggestions", ChannelType.GuildText, "partial"),
		},

		roles: {
			mod: mod ?? staff,
			exec,
			staff,
			weeklyWinner: roles.find((role) => role.name.toLowerCase().includes("weekly")),
			dev: roles.find((role) => role.name.toLowerCase().startsWith("contributor")),
			epic: roles.find((role) => role.name.toLowerCase().includes("epic")),
			booster: roles.find((role) => role.name.toLowerCase().includes("booster")),
			active: roles.find((role) => role.name.toLowerCase().includes("active")),
		},
	};

	function getChannel<T extends ChannelType>(
		name: string,
		type: T | T[] = [],
		matchType: "end" | "full" | "partial" | "start" = "full",
	): Extract<NonThreadGuildBasedChannel, { type: T }> | undefined {
		const types = new Set<ChannelType>([type].flat());
		return channels.find(
			(channel): channel is Extract<NonThreadGuildBasedChannel, { type: T }> =>
				!!channel &&
				types.has(channel.type) &&
				{
					end: channel.name.endsWith(name),
					full: channel.name === name,
					partial: channel.name.includes(name),
					start: channel.name.startsWith(name),
				}[matchType],
		);
	}
}

const config = await getConfig();
export async function syncConfig(): Promise<void> {
	const newConfig = await getConfig();
	config.roles = newConfig.roles;
	config.channels = newConfig.channels;
}
export default config;

const threads = (await guild?.channels.fetchActiveThreads())?.threads ?? new Collection();
export function getInitialChannelThreads(
	channel: Extract<Channel, { threads: ThreadManager }>,
): Collection<string, AnyThreadChannel> {
	return threads.filter(({ parent }) => parent?.id === channel.id);
}
