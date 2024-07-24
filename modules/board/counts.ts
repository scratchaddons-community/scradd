import { BaseChannel, ChannelType, type Snowflake, type TextBasedChannel } from "discord.js";
import config from "../../common/config.js";
import { getBaseChannel } from "../../util/discord.js";

const COUNTS = {
	admins: 2,
	testing: 3,
	private: 4,
	misc: 5,
	default: 6,
	memes: 8,
	info: 12,
} as const;
/**
 * Determines the board reaction count for a channel.
 *
 * @param channel - The channel to determine reaction count for.
 * @returns The reaction count.
 */
export default function boardReactionCount(channel?: TextBasedChannel, time?: number): number;
export default function boardReactionCount(
	channel: { id: Snowflake },
	time?: number,
): number | undefined;
export default function boardReactionCount(
	channel?: TextBasedChannel | { id: Snowflake },
	time = Date.now(),
): number | undefined {
	if (process.env.NODE_ENV !== "production") return shift(COUNTS.admins);
	if (!channel) return shift(COUNTS.default);

	if (channel.id === config.channels.updates?.id) return shift(COUNTS.info);
	if (!(channel instanceof BaseChannel)) {
		const count = baseReactionCount(channel.id);
		return count && shift(count);
	}

	const baseChannel = getBaseChannel(channel);
	if (!baseChannel || baseChannel.isDMBased()) return shift(COUNTS.default);
	if (baseChannel.guild.id !== config.guild.id)
		return shift(
			COUNTS[baseChannel.guild.id === config.guilds.testing.id ? "testing" : "misc"],
		);
	if (!baseChannel.isTextBased()) return shift(COUNTS.default);
	if (baseChannel.isVoiceBased()) return shift(COUNTS.misc);

	return shift(
		baseReactionCount(baseChannel.id) ??
			{
				[config.channels.info?.id || ""]: COUNTS.info,
				[config.channels.modlogs.parent?.id || ""]: COUNTS.misc,
				"866028754962612294": COUNTS.misc, // #The Cache
			}[baseChannel.parent?.id || ""] ??
			COUNTS.default,
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
		[config.channels.tickets?.id || ""]: COUNTS.default,
		[config.channels.exec?.id || ""]: COUNTS.private,
		[config.channels.admin.id || ""]: COUNTS.admins,
		"853256939089559583": COUNTS.private, // #ba-doosters
		[config.channels.devs?.id || ""]: COUNTS.private,
		"811065897057255424": COUNTS.memes, // #memes
		"806609527281549312": COUNTS.memes, // #collabs-and-ideas
		"939350305311715358": COUNTS.testing, // #modmail
		"894314668317880321": COUNTS.testing, // #evil-secret-youtube-plans
	}[id];
}
