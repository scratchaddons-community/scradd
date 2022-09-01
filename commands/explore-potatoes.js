import {
	SlashCommandBuilder,
	ButtonBuilder,
	ChannelType,
	ButtonStyle,
	CategoryChannel,
} from "discord.js";

import { boardDatabase as database, generateMessage, reactionCount } from "../common/board.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { asyncFilter, firstTrueyPromise } from "../lib/promises.js";
import { generateHash } from "../lib/text.js";
import { disableComponents } from "../lib/discord.js";
import { guild } from "../client.js";
import { MessageActionRowBuilder } from "../types/ActionRowBuilder.js";

/**
 * Determine if a text-based channel is a match of a guild-based channel.
 *
 * @param {import("discord.js").APIInteractionDataResolvedChannel | import("discord.js").GuildBasedChannel} channelWanted - Guild based channel.
 * @param {import("discord.js").Snowflake} channelFound - Text based channel.
 *
 * @returns {Promise<boolean>} Whether the channel is a match.
 */
async function textChannelMatches(channelWanted, channelFound) {
	if (channelWanted.id === channelFound) return true;

	switch (channelWanted.type) {
		case ChannelType.GuildCategory: {
			const fetchedChannel =
				channelWanted instanceof CategoryChannel
					? channelWanted
					: await guild.channels.fetch(channelWanted.id).catch(() => {});

			if (fetchedChannel?.type !== ChannelType.GuildCategory)
				throw new TypeError("Channel#type disagrees with itself pre and post fetch");

			return await firstTrueyPromise(
				fetchedChannel.children
					.valueOf()
					.map((child) => textChannelMatches(child, channelFound)),
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

const defaultMinReactions = Math.round(reactionCount() * 0.4);
/** @type {import("../types/command").ChatInputCommand} */
export default {
	data: new SlashCommandBuilder()
		.setDescription("Replies with a random message from the potatoboard")
		.addIntegerOption((input) =>
			input
				.setName("minimum-reactions")
				.setDescription(
					`Filter messages to only get those with at least this many reactions (defaults to ${defaultMinReactions})`,
				)
				.setRequired(false)
				.setMinValue(1),
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
		const minReactions =
			interaction.options.getInteger("minimum-reactions") ?? defaultMinReactions;
		const user = interaction.options.getUser("user")?.id;
		const channelWanted = interaction.options.getChannel("channel");
		const data = database.data;
		const fetchedMessages = asyncFilter(
			data.sort(() => Math.random() - 0.5),
			async (message) => {
				return (
					message.reactions >= minReactions &&
					(user ? message.user === user : true) &&
					(channelWanted
						? await textChannelMatches(channelWanted, message.channel)
						: true) &&
					message
				);
			},
		);

		const nextId = generateHash("next");
		const prevId = generateHash("prev");

		/** @type {import("discord.js").WebhookEditMessageOptions[]} */
		const messages = [];
		let index = 0;

		/** @returns {Promise<import("discord.js").WebhookEditMessageOptions>} */
		async function getNextMessage() {
			const info = (await fetchedMessages.next()).value;

			const reply = info
				? await generateMessage(info, {
						pre:
							index > 0
								? [
										new ButtonBuilder()
											.setLabel("<< Previous")
											.setCustomId(prevId)
											.setStyle(ButtonStyle.Primary),
								  ]
								: [],
						post: [
							new ButtonBuilder()
								.setLabel("Next >>")
								.setCustomId(nextId)
								.setStyle(ButtonStyle.Primary),
						],
				  })
				: {
						allowedMentions: { users: [] },
						files: [],
						components:
							index > 0
								? [
										new MessageActionRowBuilder().addComponents(
											new ButtonBuilder()
												.setLabel("<< Previous")
												.setCustomId(prevId)
												.setStyle(ButtonStyle.Primary),
										),
								  ]
								: [],

						content: `${CONSTANTS.emojis.statuses.no} No messages found. Try changing any filters you may have used.`,

						embeds: [],
						ephemeral: true,
				  };

			if (!reply) {
				database.data = data.filter(({ source }) => source !== info?.source);

				return getNextMessage();
			}
			messages.push(reply);
			return reply;
		}

		const reply = await interaction.reply(await getNextMessage());

		const collector = reply.createMessageComponentCollector({
			filter: (buttonInteraction) =>
				[prevId, nextId].includes(buttonInteraction.customId) &&
				buttonInteraction.user.id === interaction.user.id,

			time: CONSTANTS.collectorTime,
		});

		collector
			?.on("collect", async (buttonInteraction) => {
				buttonInteraction.deferUpdate();
				if (buttonInteraction.customId === prevId) index--;
				else index++;
				await interaction.editReply(messages[index] || (await getNextMessage()));

				collector.resetTimer();
			})
			.on("end", async () => {
				const source = await interaction.fetchReply();

				await interaction.editReply({
					allowedMentions: { users: [] },

					components: disableComponents(source.components),
				});
			});
	},
};
