import {
	ChannelType,
	ButtonStyle,
	type GuildBasedChannel,
	type Snowflake,
	ComponentType,
	type InteractionReplyOptions,
	ButtonInteraction,
	ChatInputCommandInteraction,
	type MessageEditOptions,
} from "discord.js";
import { boardDatabase, generateBoardMessage, boardReactionCount } from "./misc.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import { asyncFilter, firstTrueyPromise } from "../../util/promises.js";
import { generateHash } from "../../util/text.js";
import { GAME_COLLECTOR_TIME } from "../games/misc.js";

export const NO_POTATOES_MESSAGE = "No messages found. Try changing any filters you may have used.";
export const defaultMinReactions = Math.round(boardReactionCount() * 0.4);

/**
 * Determine if a text-based channel is a match of a guild-based channel.
 *
 * @param channelWanted - Guild based channel.
 * @param channelFound - Text based channel.
 *
 * @returns Whether the channel is a match.
 */
async function textChannelMatches(
	channelWanted: GuildBasedChannel,
	channelFound: Snowflake,
): Promise<boolean> {
	if (channelWanted.id === channelFound) return true;

	switch (channelWanted.type) {
		case ChannelType.GuildCategory: {
			return await firstTrueyPromise(
				channelWanted.children
					.valueOf()
					.map(async (child) => await textChannelMatches(child, channelFound)),
			);
		}
		case ChannelType.GuildForum:
		case ChannelType.GuildMedia:
		case ChannelType.GuildText:
		case ChannelType.GuildAnnouncement: {
			// If channelFound is a matching non-thread it will have already returned at the start of the function, so only check for threads.
			const thread = await config.guild.channels.fetch(channelFound).catch(() => void 0);
			return thread?.parent?.id === channelWanted.id;
		}

		default: {
			return false;
		}
	}
}

export default async function makeSlideshow(
	interaction: ChatInputCommandInteraction<"cached" | "raw"> | ButtonInteraction,
	{
		user,
		channel,
		minReactions = Math.round(
			boardReactionCount(channel?.isTextBased() ? channel : undefined) * 0.4,
		),
	}: { user?: string; channel?: GuildBasedChannel; minReactions?: number },
) {
	const ephemeral =
		interaction.isButton() && interaction.message.interaction?.user.id !== interaction.user.id;
	let reply = await interaction.deferReply({ ephemeral, fetchReply: true });

	const fetchedMessages = asyncFilter(
		boardDatabase.data
			.filter(
				(message) =>
					message.reactions >= minReactions && message.user === (user ?? message.user),
			)
			.sort(() => Math.random() - 0.5),
		async (message) =>
			(channel ? await textChannelMatches(channel, message.channel) : true) && message,
	);

	const nextId = generateHash("next");
	const previousId = generateHash("prev");

	const messages: MessageEditOptions[] = [];
	let index = 0;

	/**
	 * Get the next message to reply with.
	 *
	 * @returns The reply information.
	 */
	async function getNextMessage(): Promise<MessageEditOptions> {
		const info = (await fetchedMessages.next()).value;

		const reply = info
			? await generateBoardMessage(info, {
					pre: [
						{
							custom_id: previousId,
							label: "<< Previous",
							style: ButtonStyle.Primary,
							type: ComponentType.Button,
							disabled: index <= 0,
						},
					],
					post: [
						{
							custom_id: nextId,
							label: "Next >>",
							style: ButtonStyle.Primary,
							type: ComponentType.Button,
						},
					],
			  })
			: ({
					components: [
						{
							components: [
								{
									customId: previousId,
									label: "<< Previous",
									style: ButtonStyle.Primary,
									type: ComponentType.Button,
									disabled: index <= 0,
								},
							],

							type: ComponentType.ActionRow,
						},
					],

					content: `${constants.emojis.statuses.no} ${NO_POTATOES_MESSAGE}`,
					embeds: [],
					files: [],
			  } satisfies InteractionReplyOptions);

		if (!reply) {
			boardDatabase.data = boardDatabase.data.filter(({ source }) => source !== info?.source);

			return await getNextMessage();
		}
		messages.push(reply);
		return reply;
	}

	reply = await interaction.editReply(await getNextMessage());

	const collector = reply.createMessageComponentCollector({
		filter: (buttonInteraction) =>
			[previousId, nextId].includes(buttonInteraction.customId) &&
			buttonInteraction.user.id === interaction.user.id,

		idle: GAME_COLLECTOR_TIME,
		time: ephemeral ? 14 * 60 * 1000 + 50 : undefined,
	});

	collector
		.on("collect", async (buttonInteraction) => {
			await buttonInteraction.deferUpdate();
			if (buttonInteraction.customId === previousId) index--;
			else index++;
			reply = await interaction.editReply(
				messages[Number(index)] ?? (await getNextMessage()),
			);
		})
		.on("end", async () => {
			await interaction.editReply({
				allowedMentions: { users: [] },
				components: disableComponents(reply.components),
			});
		});
}
