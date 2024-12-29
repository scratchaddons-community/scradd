import type { Snowflake, TextBasedChannel } from "discord.js";

import { BaseChannel, ChannelType } from "discord.js";
import { getBaseChannel } from "strife.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";

const enum Counts {
	Admins = 2,
	Testing = 3,
	Private = 4,
	Misc = 5,
	Default = 6,
	Showcase = 8,
	Info = 12,
}
/**
 * Determines the board reaction count for a channel.
 *
 * @param channel - The channel to determine reaction count for.
 * @returns The reaction count.
 */
export default function boardReactionCount(channel?: TextBasedChannel): number;
export default function boardReactionCount(channel: { id: Snowflake }): number | undefined;
export default function boardReactionCount(
	channel?: TextBasedChannel | { id: Snowflake },
): number | undefined {
	if (constants.env === "development") return shift(Counts.Admins);
	if (!channel) return shift(Counts.Default);

	if (channel.id === config.channels.updates?.id) return shift(Counts.Info);
	if (!(channel instanceof BaseChannel)) {
		const count = baseReactionCount(channel.id);
		return count && shift(count);
	}

	const baseChannel = getBaseChannel(channel);
	if (!baseChannel || baseChannel.isDMBased()) return shift(Counts.Default);
	if (baseChannel.guild.id === config.guilds.testing.id) return shift(Counts.Testing);
	if (baseChannel.guild.id !== config.guild.id) return shift(Counts.Misc);
	if (baseChannel.isThreadOnly()) return shift(Counts.Default);
	if (baseChannel.isVoiceBased()) return shift(Counts.Misc);

	return shift(
		baseReactionCount(baseChannel.id) ??
			{
				"991792808996372510": Counts.Info, // Info
				[config.channels.modlogs.parent?.id || ""]: Counts.Misc,
			}[baseChannel.parent?.id || ""] ??
			Counts.Default,
	);

	function shift(count: number): number {
		const privateThread =
			channel instanceof BaseChannel && channel.type === ChannelType.PrivateThread ?
				2 / 3
			:	1;
		return Math.max(2, Math.round(count * privateThread));
	}
}
function baseReactionCount(id: Snowflake): number | undefined {
	return {
		"1064409498757910528": Counts.Default, // #contact-mods
		"816329956074061867": Counts.Admins, // #admin-talk
		"853256939089559583": Counts.Private, // #ba-doosters
		"869662117651955802": Counts.Private, // #devs-only
		"811065897057255424": Counts.Showcase, // #memes
		"806609527281549312": Counts.Showcase, // #collabs-and-ideas
		"939350305311715358": Counts.Testing, // #modmail
		"894314668317880321": Counts.Testing, // #evil-secret-youtube-plans
	}[id];
}
