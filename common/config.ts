import type {
	AnyThreadChannel,
	ForumChannel,
	ForumThreadChannel,
	Guild,
	MediaChannel,
	NewsChannel,
	NonThreadGuildBasedChannel,
	PublicThreadChannel,
	Role,
	TextChannel,
	TextThreadChannel,
} from "discord.js";

import assert from "node:assert";

import { ChannelType, Collection } from "discord.js";
import { client } from "strife.js";

import { CUSTOM_ROLE_PREFIX } from "../modules/roles/misc.ts";
import constants from "./constants.ts";

const guild =
	constants.env === "testing" ? undefined : await client.guilds.fetch(process.env.GUILD_ID);
if (guild && !guild.available) throw new ReferenceError("Main server is unavailable!");
const threads = (await guild?.channels.fetchActiveThreads())?.threads ?? new Collection();

function assertOutsideTests<T>(value: T): TSReset.NonFalsy<T> {
	if (constants.env !== "testing") assert(value);
	return value as TSReset.NonFalsy<T>;
}

const guildIds = {
	testing: "938438560925761619",
	development: "751206349614088204",
} as const;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function getConfig() {
	const otherGuilds = guild && (await client.guilds.fetch());
	if (otherGuilds) otherGuilds.delete(guild.id);
	const guilds = Object.fromEntries(
		await Promise.all(
			Object.entries(guildIds).map(async ([key, id]) => {
				const basic: Partial<Guild> & { id: typeof id } = { id, valueOf: () => id };
				return [
					key,
					guild ? await client.guilds.fetch(id).catch(() => basic) : basic,
				] as const;
			}),
		),
	);

	const channels = (await guild?.channels.fetch()) ?? new Collection();
	const modlogsChannel =
		guild?.publicUpdatesChannel ?? getChannel("logs", ChannelType.GuildText, "end");
	const modChannel = assertOutsideTests(
		getChannel("mod-talk", ChannelType.GuildText) ?? modlogsChannel,
	);

	const roles = ((await guild?.roles.fetch()) ?? new Collection()).filter(
		(role) => !role.managed && !role.name.startsWith(CUSTOM_ROLE_PREFIX),
	);
	const modRole = getRole("mod", "start");
	const staffRole = assertOutsideTests(getRole("staff", "start") ?? modRole);

	const tickets = getChannel("contact", ChannelType.GuildText);
	return {
		channels: {
			info: getChannel("info", ChannelType.GuildCategory, "start"),
			announcements:
				guild?.systemChannel ??
				getChannel(
					"server",
					[ChannelType.GuildText, ChannelType.GuildAnnouncement],
					"start",
				),
			board: getChannel(
				"board",
				[ChannelType.GuildText, ChannelType.GuildAnnouncement],
				"end",
			),
			servers: getChannel("servers", ChannelType.GuildText, "end"),
			tickets,
			server: tickets && getInitialThreads(tickets, "Server ").first(),
			welcome: getChannel("welcome", ChannelType.GuildText),

			mod: modChannel,
			modlogs: assertOutsideTests(modlogsChannel ?? modChannel),
			admin: getChannel("admin", ChannelType.GuildText, "start") ?? modChannel,

			general: getChannel("general", ChannelType.GuildText, "full"),

			support: getChannel("support", ChannelType.GuildText),
			updates: getChannel("updates", ChannelType.GuildText),
			suggestions: getChannel("suggestions", ChannelType.GuildForum, "full"),
			bugs: getChannel("bug", ChannelType.GuildForum, "start"),
			devs: getChannel("devs", ChannelType.GuildText, "start"),

			share: getChannel("share", ChannelType.GuildForum, "full"),
			bots: getChannel("bots", ChannelType.GuildText),

			oldSuggestions: getChannel("suggestions", ChannelType.GuildText),

			errors: assertOutsideTests(
				getChannel(
					"error",
					ChannelType.GuildText,
					"partial",
					await guilds.testing.channels?.fetch(),
				),
			),
		},

		guild: assertOutsideTests(guild),
		guilds,
		otherGuildIds: otherGuilds ? [...otherGuilds.keys()] : [],

		roles: {
			mod: modRole ?? staffRole,
			helper: getRole("helper", "start") ?? modRole ?? staffRole,
			staff: staffRole,
			weeklyWinner: getRole("weekly"),
			dev: getRole("dev", "start"),
			epic: getRole("epic"),
			booster: getRole("booster"),
			active: getRole("active"),
			established: getRole("established"),
		},
	};

	function getChannel<T extends ChannelType>(
		search: Lowercase<string>,
		type: T | T[] = [],
		matchType: "end" | "full" | "partial" | "start" = "partial",
		searchChannels: Collection<string, NonThreadGuildBasedChannel | null> = channels,
	): Extract<NonThreadGuildBasedChannel, { type: T }> | undefined {
		const types = new Set<ChannelType>([type].flat());
		return searchChannels.find(
			(channel): channel is Extract<NonThreadGuildBasedChannel, { type: T }> => {
				if (!channel || !types.has(channel.type)) return false;
				const name = channel.name.toLowerCase();
				return {
					end: () => name.endsWith(search),
					full: () => name === search,
					partial: () => name.includes(search),
					start: () => name.startsWith(search),
				}[matchType]();
			},
		);
	}

	function getRole(
		search: string,
		matchType: "end" | "full" | "partial" | "start" = "partial",
	): Role | undefined {
		return roles.find((role) => {
			const name = role.name.toLowerCase();
			return {
				end: () => name.endsWith(search),
				full: () => name === search,
				partial: () => name.includes(search),
				start: () => name.startsWith(search),
			}[matchType]();
		});
	}
}

const config = await getConfig();
export async function syncConfig(): Promise<void> {
	const newConfig = await getConfig();
	config.channels = newConfig.channels;
	config.guilds = newConfig.guilds;
	config.otherGuildIds = newConfig.otherGuildIds;
	config.roles = newConfig.roles;
}
export default config;

export function getInitialThreads(
	channel: ForumChannel | MediaChannel,
	filter?: string,
): Collection<string, ForumThreadChannel>;
export function getInitialThreads(
	channel: NewsChannel | TextChannel,
	filter: string,
): Collection<string, PublicThreadChannel<false>>;
export function getInitialThreads(
	channel: NewsChannel | TextChannel,
	filter?: undefined,
): Collection<string, TextThreadChannel>;
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
