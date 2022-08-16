import {
	SlashCommandBuilder,
	Message,
	ButtonBuilder,
	EmbedBuilder,
	MessageMentions,
	ChannelType,
	ButtonStyle,
	ComponentType,
	CategoryChannel,
} from "discord.js";

import { BOARD_CHANNEL, MIN_REACTIONS } from "../common/board.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { asyncFilter, firstTrueyPromise } from "../lib/promises.js";
import { generateHash } from "../lib/text.js";
import { disableComponents, getAllMessages } from "../lib/message.js";
import { MessageActionRowBuilder } from "../types/ActionRowBuilder.js";

/**
 * Determine if a text-based channel is a match of a guild-based channel.
 *
 * @param {import("discord.js").APIInteractionDataResolvedChannel | import("discord.js").GuildBasedChannel} channelWanted - Guild based channel.
 * @param {string} channelFound - Text based channel.
 * @param {import("discord.js").Guild} guild
 *
 * @returns {Promise<boolean>} Whether the channel is a match.
 */
async function textChannelMatches(guild, channelWanted, channelFound) {
	if (channelWanted.id === channelFound) return true;

	switch (channelWanted.type) {
		case ChannelType.GuildCategory: {
			const fetchedChannel =
				channelWanted instanceof CategoryChannel
					? channelWanted
					: await guild.channels.fetch(channelWanted.id);

			if (fetchedChannel?.type !== ChannelType.GuildCategory)
				throw new TypeError("Channel#type disagrees with itself pre and post fetch");

			return await firstTrueyPromise(
				fetchedChannel.children
					.valueOf()
					.map((child) => textChannelMatches(guild, child, channelFound)),
			);
		}
		case ChannelType.GuildForum:
		case ChannelType.GuildText:
		case ChannelType.GuildNews: {
			// If channelFound is a matching non-thread it will have already returned at the start of the function, so only check for threads.
			const thread = await guild.channels.fetch(channelFound).catch(() => {});
			return thread?.parent?.id === channelWanted.id;
		}

		default: {
			// It’s a DM, stage, directory, non-matching thread, non-matching VC, or an unimplemented channel type.
			return false;
		}
	}
}

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Replies with a random message from the potatoboard")
		.addIntegerOption((input) =>
			input
				.setName("minimum-reactions")
				.setDescription(
					"Filter messages to only get those with at least this many reactions",
				)
				.setRequired(false)
				.setMinValue(MIN_REACTIONS),
		)
		.addUserOption((input) =>
			input
				.setName("user")
				.setDescription("Filter messages to only get those by a certain user")
				.setRequired(false),
		)
		.addChannelOption((input) =>
			input
				.setName("channel")
				.setDescription("Filter messages to only get those in a certain channel")
				.setRequired(false)
				.addChannelTypes(
					ChannelType.GuildText,
					ChannelType.GuildVoice,
					ChannelType.GuildCategory,
					ChannelType.GuildNews,
					ChannelType.GuildNewsThread,
					ChannelType.GuildPublicThread,
					ChannelType.GuildPrivateThread,
					// ChannelType.GuildForum,
				),
		),

	async interaction(interaction) {
		const deferred = await interaction.deferReply({
			ephemeral: interaction.channel?.id !== process.env.BOTS_CHANNEL,
		});
		const board = await interaction.guild.channels.fetch(BOARD_CHANNEL);
		if (!board?.isTextBased()) {
			throw new ReferenceError("Could not find board channel");
		}

		const minReactions = interaction.options.getInteger("minimum-reactions") ?? 0;
		const user = interaction.options.getUser("user")?.id;
		const channelWanted = interaction.options.getChannel("channel");
		const fetchedMessages = await getAllMessages(board).then((messages) =>
			asyncFilter(
				messages
					.filter((message) => {
						if (
							!message.content ||
							!message.embeds[0] ||
							!message.author.bot ||
							(/\d+/.exec(message.content)?.[0] ?? 0) < minReactions
						)
							return false;
						return message;
					})
					.sort(() => Math.random() - 0.5),
				async (message) => {
					if (user && message.content.match(MessageMentions.UsersPattern)?.[1] !== user)
						return false;

					const channelFound = message.content.match(
						MessageMentions.ChannelsPattern,
					)?.[1];

					if (
						channelFound &&
						channelWanted &&
						!(await textChannelMatches(interaction.guild, channelWanted, channelFound))
					)
						return false;

					return message;
				},
			),
		);

		const customId = generateHash("next");
		const nextButton = new ButtonBuilder()
			.setLabel("Next")
			.setCustomId(customId)
			.setStyle(ButtonStyle.Secondary);

		let source = (await fetchedMessages.next()).value;
		/**
		 * Grab a new message from the board.
		 *
		 * @param {void | Message} current
		 *
		 * @returns {Promise<import("discord.js").InteractionReplyOptions>} - Reply to post next.
		 */
		async function generateMessage(current) {
			if (!current) {
				return {
					allowedMentions: { users: [] },
					files: [],
					components: [],

					content: `${CONSTANTS.emojis.statuses.no} No messages found. Try changing any filters you may have used.`,

					embeds: [],
					ephemeral: true,
				};
			}
			source = (await fetchedMessages.next()).value;
			const linkButton = current.components?.[0]?.components?.[0];
			return {
				allowedMentions: { users: [] },

				components: [
					new MessageActionRowBuilder().setComponents(
						linkButton?.type === ComponentType.Button
							? [ButtonBuilder.from(linkButton), nextButton]
							: [nextButton],
					),
				],

				content: current.content,
				embeds: current.embeds.map((oldEmbed) => EmbedBuilder.from(oldEmbed)),
				ephemeral: interaction.channel?.id !== process.env.BOTS_CHANNEL,
				files: current.attachments.map((attachment) => attachment),
			};
		}

		await interaction.editReply(await generateMessage(source));

		const collector = deferred.createMessageComponentCollector({
			filter: (buttonInteraction) =>
				buttonInteraction.customId === customId &&
				buttonInteraction.user.id === interaction.user.id,

			time: CONSTANTS.collectorTime,
		});

		collector
			?.on("collect", async (buttonInteraction) => {
				buttonInteraction.deferUpdate();
				await interaction.editReply(await generateMessage(source));

				collector.resetTimer();
			})
			.on("end", async () => {
				const source = await interaction.fetchReply();

				await interaction.editReply({
					allowedMentions: { users: [] },

					components: disableComponents(source.components),

					content: source.content,
					embeds: source.embeds.map((oldEmbed) => EmbedBuilder.from(oldEmbed)),
					files: source.attachments.map((attachment) => attachment),
				});
			});
	},
};

export default info;
