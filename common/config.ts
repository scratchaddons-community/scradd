import assert from "node:assert";
import {
	ChannelType,
	Collection,
	type AnyThreadChannel,
	type ForumChannel,
	type Guild,
	type MediaChannel,
	type NewsChannel,
	type NonThreadGuildBasedChannel,
	type PublicThreadChannel,
	type TextChannel,
} from "discord.js";
import { client } from "strife.js";
import { CUSTOM_ROLE_PREFIX } from "../modules/roles/misc.js";
import type { NonFalsy } from "./misc.js";
import constants from "./constants.js";

const guild = constants.isTesting ? undefined : await client.guilds.fetch(process.env.GUILD_ID);
if (guild && !guild.available) throw new ReferenceError("Main server is unavailable!");
const threads = (await guild?.channels.fetchActiveThreads())?.threads ?? new Collection();

function assertOutsideTests<T>(value: T): NonFalsy<T> {
	if (!constants.isTesting) assert(value);
	return value as NonFalsy<T>;
}

const guildIds = {
	testing: "938438560925761619",
	development: "751206349614088204",
} as const;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function getConfig() {
	const otherGuilds = guild && (await client.guilds.fetch());
	if (otherGuilds) otherGuilds.delete(guild.id);

	const channels = (await guild?.channels.fetch()) ?? new Collection();
	const modlogsChannel =
		guild?.publicUpdatesChannel ?? getChannel("logs", ChannelType.GuildText, "end");
	const modChannel = assertOutsideTests(
		getChannel("mod-talk", ChannelType.GuildText) ?? modlogsChannel,
	);

	const roles = ((await guild?.roles.fetch()) ?? new Collection()).filter(
		(role) => !role.managed && !role.name.startsWith(CUSTOM_ROLE_PREFIX),
	);
	const modRole = roles.find((role) => role.name.toLowerCase().startsWith("mod"));
	const staffRole = assertOutsideTests(
		roles.find((role) => role.name.toLowerCase().startsWith("staff")) ?? modRole,
	);
	const execRole = roles.find((role) => role.name.toLowerCase().includes("exec")) ?? staffRole;

	const tickets = getChannel("contact", ChannelType.GuildText, "start");
	return {
		guild: assertOutsideTests(guild),
		otherGuildIds: otherGuilds ? [...otherGuilds.keys()] : [],
		guilds: Object.fromEntries(
			await Promise.all(
				Object.entries(guildIds).map(async ([key, id]) => {
					const basic: Partial<Guild> & { id: typeof id } = { id, valueOf: () => id };
					return [
						key,
						guild ? await client.guilds.fetch(id).catch(() => basic) : basic,
					] as const;
				}),
			),
		),

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
			tickets,
			server: tickets && getInitialThreads(tickets, "Server ").first(),
			welcome: getChannel("welcome", ChannelType.GuildText),
			intros: getChannel("intro", ChannelType.GuildText, "partial"),

			mod: modChannel,
			modlogs: assertOutsideTests(modlogsChannel ?? modChannel),
			exec: getChannel("exec", ChannelType.GuildText, "start"),
			admin: getChannel("admin", ChannelType.GuildText, "start") ?? modChannel,

			general: getChannel("general", ChannelType.GuildText),

			support: getChannel("support", ChannelType.GuildText, "partial"),
			updates: getChannel("updates", ChannelType.GuildText, "partial"),
			suggestions: getChannel("suggestions", ChannelType.GuildForum),
			bugs: getChannel("bug", ChannelType.GuildForum, "start"),
			devs: getChannel("devs", ChannelType.GuildText, "start"),

			qotd: getChannel("question", ChannelType.GuildForum, "partial"),
			share: getChannel("share", ChannelType.GuildForum),
			bots: getChannel("bots", ChannelType.GuildText, "partial"),

			oldSuggestions: getChannel("suggestions", ChannelType.GuildText, "partial"),
		},

		roles: {
			mod: modRole ?? staffRole,
			exec: execRole,
			staff: staffRole,
			weeklyWinner: roles.find((role) => role.name.toLowerCase().includes("weekly")),
			dev: roles.find((role) => role.name.toLowerCase().startsWith("dev")),
			epic: roles.find((role) => role.name.toLowerCase().includes("epic")),
			booster: roles.find((role) => role.name.toLowerCase().includes("booster")),
			active: roles.find((role) => role.name.toLowerCase().includes("active")),
			established: roles.find((role) => role.name.toLowerCase().includes("established")),
			autoKick: roles.find((role) => role.name.toLowerCase().includes("autokick")),
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

export function getInitialThreads(
	channel: ForumChannel | MediaChannel,
	filter?: string,
): Collection<string, PublicThreadChannel<true>>;
export function getInitialThreads(
	channel: NewsChannel | TextChannel,
	filter: string,
): Collection<string, PublicThreadChannel<false>>;
export function getInitialThreads(
	channel: NewsChannel | TextChannel,
	filter?: undefined,
): Collection<string, AnyThreadChannel<false>>;
export function getInitialThreads(
	channel?: ForumChannel | MediaChannel | NewsChannel | TextChannel,
	filter?: undefined,
): Collection<string, AnyThreadChannel>;
export function getInitialThreads(
	channel: ForumChannel | MediaChannel | NewsChannel | TextChannel | undefined,
	filter: string,
): Collection<string, PublicThreadChannel>;
export function getInitialThreads(
	channel?: ForumChannel | MediaChannel | NewsChannel | TextChannel,
	filter?: string,
): Collection<string, AnyThreadChannel> {
	return threads.filter(
		(thread) =>
			(!channel || thread.parent?.id === channel.id) &&
			(!filter ||
				(thread.type !== ChannelType.PrivateThread && thread.name.includes(filter))),
	);
}
