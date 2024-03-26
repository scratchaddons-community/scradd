import {
	BaseChannel,
	ButtonStyle,
	ChannelType,
	ComponentType,
	Message,
	type APIButtonComponent,
	type BaseMessageOptions,
	type Snowflake,
	type TextBasedChannel,
} from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import Database from "../../common/database.js";
import { extractMessageExtremities, getBaseChannel, messageToEmbed } from "../../util/discord.js";
import tryCensor, { censor } from "../automod/misc.js";

export const BOARD_EMOJI = process.env.NODE_ENV === "production" ? "🥔" : "⭐",
	REACTIONS_NAME = process.env.NODE_ENV === "production" ? "Potatoes" : "Stars";

export const boardDatabase = new Database<{
	/** The number of reactions this message has. */
	reactions: number;
	/** The ID of the user who posted this. */
	user: Snowflake;
	/** The ID of the channel this message is in. */
	channel: Snowflake;
	/** The ID of the message on the board. */
	onBoard: Snowflake | 0;
	/** The ID of the original message. */
	source: Snowflake;
}>("board");
await boardDatabase.init();

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
export function boardReactionCount(channel?: TextBasedChannel, time?: number): number;
export function boardReactionCount(channel: { id: Snowflake }, time?: number): number | undefined;
export function boardReactionCount(
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
		return shift(COUNTS[baseChannel.guild.id === config.testingGuild?.id ? "testing" : "misc"]);
	if (!baseChannel.isTextBased()) return shift(COUNTS.default);
	if (baseChannel.isVoiceBased()) return shift(COUNTS.misc);

	return shift(
		baseReactionCount(baseChannel.id) ??
			{
				[config.channels.info?.id || ""]: COUNTS.info,
				[config.channels.modlogs?.parent?.id || ""]: COUNTS.misc,
				"866028754962612294": COUNTS.misc, // #The Cache
			}[baseChannel.parent?.id || ""] ??
			COUNTS.default,
	);

	function shift(count: number): number {
		const privateThread =
			channel instanceof BaseChannel && channel.type === ChannelType.PrivateThread ?
				2 / 3
			:	1;
		/** 500 = number of days for required potato count to double. */
		const timeShift = (Date.now() - +time) / 86_400_000 / 500 + 1;
		return Math.max(2, Math.round(count * privateThread * timeShift));
	}
}
function baseReactionCount(id: Snowflake): number | undefined {
	return {
		[config.channels.tickets?.id || ""]: COUNTS.default,
		[config.channels.exec?.id || ""]: COUNTS.private,
		[config.channels.admin?.id || ""]: COUNTS.admins,
		"853256939089559583": COUNTS.private, // #ba-doosters
		[config.channels.devs?.id || ""]: COUNTS.private,
		"811065897057255424": COUNTS.memes, // #memes
		"806609527281549312": COUNTS.memes, // #collabs-and-ideas
		"806656240129671188": COUNTS.memes, // #showcase
		[config.channels.advertise?.id || ""]: COUNTS.memes,
		"939350305311715358": COUNTS.testing, // #modmail
		"894314668317880321": COUNTS.testing, // #evil-secret-youtube-plans
	}[id];
}

/**
 * Generate an embed and button to represent a board message with.
 *
 * @param info - Info to generate a message from.
 * @param extraButtons - Extra custom buttons to show.
 * @returns The representation of the message.
 */
export async function generateBoardMessage(
	info: (typeof boardDatabase.data)[number] | Message,
	extraButtons: { pre?: APIButtonComponent[]; post?: APIButtonComponent[] } = {},
): Promise<BaseMessageOptions | undefined> {
	const count =
		info instanceof Message ? info.reactions.resolve(BOARD_EMOJI)?.count || 0 : info.reactions;

	/**
	 * Convert a message to an embed and button representation.
	 *
	 * @param message - The message to convert.
	 * @returns The converted message.
	 */
	async function messageToBoardData(message: Message): Promise<BaseMessageOptions> {
		const { files, embeds } = extractMessageExtremities(message, tryCensor);
		embeds.unshift(await messageToEmbed(message, censor));

		return {
			allowedMentions: { users: [] },
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						...(extraButtons.pre ?? []),
						{
							label: "Message",
							style: ButtonStyle.Link,
							type: ComponentType.Button,
							url: message.url,
						},
						...(extraButtons.post ?? []),
					],
				},
			],
			content: `**${BOARD_EMOJI} ${count}** | ${formatChannel(
				message.channel,
			)} | ${message.author.toString()}`,
			embeds: embeds.slice(0, 10),
			files,
		};
	}

	if (info instanceof Message) return await messageToBoardData(info);

	const onBoard =
		info.onBoard &&
		(await config.channels.board?.messages.fetch(info.onBoard).catch(() => void 0));

	if (onBoard) {
		const linkButton = onBoard.components[0]?.components?.[0];
		const buttons =
			linkButton?.type === ComponentType.Button ?
				[...(extraButtons.pre ?? []), linkButton.toJSON(), ...(extraButtons.post ?? [])]
			:	[...(extraButtons.pre ?? []), ...(extraButtons.post ?? [])];

		return {
			allowedMentions: { users: [] },

			components:
				buttons.length ? [{ type: ComponentType.ActionRow, components: buttons }] : [],

			content: onBoard.content,
			embeds: onBoard.embeds.map((oldEmbed) => oldEmbed.data),
			files: onBoard.attachments.map((attachment) => attachment),
		};
	}

	const channel = await client.channels.fetch(info.channel).catch(() => void 0);
	if (!channel?.isTextBased()) return;

	const message = await channel.messages.fetch(info.source).catch(() => void 0);
	if (!message) return;

	return await messageToBoardData(message);
}

function formatChannel(channel: TextBasedChannel): string {
	const thread = channel.isThread() && channel.parent?.toString();
	const otherServer =
		!channel.isDMBased() &&
		channel.guild.id !== config.guild.id &&
		(channel.guild.id === config.saDevGuildId ? "SA Dev" : config.guild.name);

	if (thread && otherServer) return `${channel.toString()} (${thread} - ${otherServer})`;
	if (thread) return `${channel.toString()} (${thread})`;
	if (otherServer) return `${channel.toString()} (${otherServer})`;
	return channel.toString();
}
