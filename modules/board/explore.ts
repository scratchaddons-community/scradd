import {
	ChannelType,
	ButtonStyle,
	CategoryChannel,
	type APIInteractionDataResolvedChannel,
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

export const NO_BOARDS_MESSAGE = "No messages found. Try changing any filters you may have used.";
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
	channelWanted: APIInteractionDataResolvedChannel | GuildBasedChannel,
	channelFound: Snowflake,
	guild = "guild" in channelWanted ? channelWanted.guild : config.guild,
): Promise<boolean> {
	if (channelWanted.id === channelFound) return true;

	switch (channelWanted.type) {
		case ChannelType.GuildCategory: {
			const fetchedChannel =
				channelWanted instanceof CategoryChannel
					? channelWanted
					: await guild.channels.fetch(channelWanted.id).catch(() => void 0);

			if (fetchedChannel?.type !== ChannelType.GuildCategory)
				throw new TypeError("Channel#type disagrees with itself pre and post fetch");

			return await firstTrueyPromise(
				fetchedChannel.children
					.valueOf()
					.map(async (child) => await textChannelMatches(child, channelFound, guild)),
			);
		}
		case ChannelType.GuildForum:
		case ChannelType.GuildText:
		case ChannelType.GuildAnnouncement: {
			// If channelFound is a matching non-thread it will have already returned at the start of the function, so only check for threads.
			const thread = await guild.channels.fetch(channelFound).catch(() => void 0);
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
		minReactions = defaultMinReactions,
		user,
		channel: channelWanted,
	}: {
		minReactions?: number;
		user?: string;
		channel?: APIInteractionDataResolvedChannel | GuildBasedChannel;
	} = {},
) {
	const ephemeral =
		interaction.isButton() && interaction.message.interaction?.user.id !== interaction.user.id;
	let reply = await interaction.deferReply({ ephemeral, fetchReply: true });

	const { data } = boardDatabase;
	const fetchedMessages = asyncFilter(
		[...data].sort(() => Math.random() - 0.5),
		async (message) =>
			message.reactions >= minReactions &&
			message.user === (user ?? message.user) &&
			(!channelWanted ||
				(await textChannelMatches(
					channelWanted,
					message.channel,
					interaction.guild ?? undefined,
				))) &&
			message,
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

					content: `${constants.emojis.statuses.no} ${NO_BOARDS_MESSAGE}`,
					embeds: [],
					files: [],
			  } satisfies InteractionReplyOptions);

		if (!reply) {
			boardDatabase.data = data.filter(({ source }) => source !== info?.source);

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
