import type { APIButtonComponent, BaseMessageOptions, TextBasedChannel } from "discord.js";
import type { boardDatabase } from "./misc.ts";

import { ButtonStyle, ComponentType, Message } from "discord.js";
import { client } from "strife.js";

import config from "../../common/config.ts";
import { extractMessageExtremities, messageToEmbed } from "../../util/discord.ts";
import { BOARD_EMOJI } from "./misc.ts";

export default async function generateBoardMessage(
	info: (typeof boardDatabase.data)[number] | Message,
	extraButtons: { pre?: APIButtonComponent[]; post?: APIButtonComponent[] } = {},
): Promise<BaseMessageOptions | undefined> {
	const count =
		info instanceof Message ? info.reactions.resolve(BOARD_EMOJI)?.count || 0 : info.reactions;

	async function messageToBoardData(message: Message): Promise<BaseMessageOptions> {
		const { files, embeds } = await extractMessageExtremities(message, );
		embeds.unshift(await messageToEmbed(message,));

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
			...(await extractMessageExtremities(onBoard)),
			content: onBoard.content,
			components:
				buttons.length ? [{ type: ComponentType.ActionRow, components: buttons }] : [],
			allowedMentions: { users: [] },
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
