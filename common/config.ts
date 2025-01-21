import type { NonThreadGuildBasedChannel } from "discord.js";

import assert from "node:assert";

import { ChannelType, Collection } from "discord.js";
import { client } from "strife.js";

import constants from "./constants.ts";

const guild =
	constants.env === "testing" ? undefined : await client.guilds.fetch(process.env.GUILD_ID);
if (guild && !guild.available) throw new ReferenceError("Main server is unavailable!");

function assertOutsideTests<T>(value: T): TSReset.NonFalsy<T> {
	if (constants.env !== "testing") assert(value);
	return value as TSReset.NonFalsy<T>;
}

const channels = (await guild?.channels.fetch()) ?? new Collection();

export default {
	channels: {
		suggestions: getChannel("suggestions", ChannelType.GuildForum, "full"),
		oldSuggestions: getChannel("suggestions", ChannelType.GuildText),
	},
	guild: assertOutsideTests(guild),
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
