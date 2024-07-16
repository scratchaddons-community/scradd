import {
	ButtonStyle,
	ComponentType,
	Message,
	type APIButtonComponent,
	type BaseMessageOptions,
	type TextBasedChannel,
} from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import { extractMessageExtremities, messageToEmbed } from "../../util/discord.js";
import tryCensor, { censor } from "../automod/misc.js";
import { BOARD_EMOJI, type boardDatabase } from "./misc.js";

/**
 * Generate an embed and button to represent a board message with.
 *
 * @param info - Info to generate a message from.
 * @param extraButtons - Extra custom buttons to show.
 * @returns The representation of the message.
 */
export default async function generateBoardMessage(
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
	const guildName =
		!channel.isDMBased() &&
		channel.guild.id !== config.guild.id &&
		(channel.guild.id === config.guilds.development.id ? "SA Dev" : channel.guild.name);

	if (thread && guildName) return `${channel.toString()} (${thread} - ${guildName})`;
	if (thread) return `${channel.toString()} (${thread})`;
	if (guildName) return `${channel.toString()} (${guildName})`;
	return channel.toString();
}
