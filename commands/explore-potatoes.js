// @ts-nocheck -- TODO: re-eneable
import {
	SlashCommandBuilder,
	Message,
	ButtonBuilder,
	EmbedBuilder,
	MessageMentions,
	ChannelType,
	ButtonStyle,
} from "discord.js";

import { BOARD_CHANNEL, MIN_REACTIONS } from "../common/board.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { asyncFilter, firstTrueyPromise } from "../lib/promises.js";
import { generateHash } from "../lib/text.js";
import { disableComponents, getAllMessages } from "../lib/message.js";
import { MessageActionRowBuilder } from "../types/ActionRowBuilder.js";

/** @type {{ [key: string]: { [key: string]: boolean } }} */
const threadsFound = {};

/**
 * Determine if a text-based channel is a match of a guild-based channel.
 *
 * @param {import("discord.js").GuildBasedChannel} channelWanted - Guild based channel.
 * @param {string} channelFound - Text based channel.
 *
 * @returns {Promise<boolean>} Whether the channel is a match.
 */
async function textChannelMatches(channelWanted, channelFound) {
	switch (channelWanted.type) {
		case "GUILD_TEXT":
		case "GUILD_NEWS": {
			// Text
			if (channelFound === channelWanted.id) return true;

			if (threadsFound[`${channelWanted.id}`]?.[`${channelFound}`] !== undefined)
				return !!threadsFound[`${channelFound}`];

			const thread = (
				await channelWanted.threads.fetchArchived({ before: channelFound, limit: 2 })
			).threads.first();

			(threadsFound[channelWanted.id] ??= {})[channelFound] = !!(
				thread && channelFound === thread?.id
			);

			if (thread && channelFound === thread.id) return true;
			else return false;
		}
		case "GUILD_CATEGORY": {
			// category
			const promises = [];

			for (const channel of channelWanted.children.values())
				promises.push(textChannelMatches(channel, channelFound));

			if (!(await firstTrueyPromise(promises))) return false;

			break;
		}
		case "GUILD_NEWS_THREAD":
		case "GUILD_PUBLIC_THREAD": {
			// other public thread
			if (typeof channelFound === "string" && channelWanted.id === channelFound) break;
			else return false;
		}

		default: {
			// It’s likely a VC
			return false;
		}
	}

	return true;
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
				.addChannelTypes([
					ChannelType.GuildText,
					ChannelType.GuildVoice,
					ChannelType.GuildCategory,
					ChannelType.GuildNews,
					ChannelType.GuildNewsThread,
					ChannelType.GuildPublicThread,
					ChannelType.GuildPrivateThread,
				]),
		),

	async interaction(interaction) {
		const deferred = await interaction.deferReply({
			ephemeral: interaction.channel?.id !== process.env.BOTS_CHANNEL,
		});
		const board = await interaction.guild?.channels.fetch(BOARD_CHANNEL);

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
					// "**🥔 8** | <#1001943698323554334> (<#811065897057255424>) | <@891316244580544522>"
					// "**🥔 11** | <#811065897057255424> | <@771422735486156811>"
					if (user && message.content.match(MessageMentions.USERS_PATTERN)?.[1] !== user)
						return false;
					const channels = message.content.match(MessageMentions.CHANNELS_PATTERN);
					const channelFound = channels?.[2] || channels?.[1];

					const channelWantedFetched =
						channelWanted &&
						(channelWanted instanceof Channel
							? channelWanted
							: await interaction.guild?.channels.fetch(channelWanted.id));

					if (
						channelWantedFetched &&
						channelFound &&
						!(await textChannelMatches(channelWantedFetched, channelFound))
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
			.setStyle(ButtonStyle.Secondary)
			.setEmoji("➡");

		let source = (await fetchedMessages.next()).value;
		/**
		 * Grab a new message from the board.
		 *
		 * @param {void | Message<boolean>} current
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

			const row = current.components?.[0];
			return {
				allowedMentions: { users: [] },

				components: [
					new MessageActionRowBuilder(row).setComponents(
						row?.components?.[0],
						nextButton,
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
