/** @file Command To get a random message from the #potatoboard. */
import { SlashCommandBuilder } from "@discordjs/builders";
import { Message, MessageButton, MessageEmbed } from "discord.js";
import dotenv from "dotenv";

import { BOARD_CHANNEL, boardMessageToSource, MIN_REACTIONS } from "../common/board.js";
import asyncFilter from "../lib/asyncFilter.js";
import firstPromiseValued from "../lib/firstPromiseValued.js";
import generateHash from "../lib/generateHash.js";
import getAllMessages from "../lib/getAllMessages.js";

dotenv.config();

/** @type {{ [key: string]: { [key: string]: boolean } }} */
const threadsFound = {};

/**
 * Determine if a text-based channel is a match of a guild-based channel.
 *
 * @param {import("discord.js").GuildBasedChannel} channelWanted - Guild based channel.
 * @param {import("discord.js").TextBasedChannel | string} channelFound - Text based channel.
 *
 * @returns {Promise<boolean>} Whether the channel is a match.
 */
async function textChannelMatches(channelWanted, channelFound) {
	switch (channelWanted.type) {
		case "GUILD_TEXT":
		case "GUILD_NEWS": {
			// Text
			if (typeof channelFound === "string") {
				// We likely found an archived thread. We have the id insted of the channel object.
				// Try to see if we can find it by name instead of checking parentId.
				if (threadsFound[`${channelWanted.id}`]?.[`${channelFound}`] !== undefined)
					return !!threadsFound[`${channelFound}`];

				const thread = (
					await channelWanted.threads.fetchArchived({
						before: channelFound,
						limit: 2,
					})
				).threads.first();

				threadsFound[channelWanted.id] = {
					...threadsFound[channelWanted.id],
					[channelFound]: !!(thread && channelFound === thread?.id),
				};

				if (thread && channelFound === thread.id) break;
				else return false;
			}

			if (channelFound.id === channelWanted.id) break;

			return channelFound.isThread() && channelFound.parentId === channelWanted.id;
		}
		case "GUILD_CATEGORY": {
			//	category
			const promises = [];

			for (const channel of channelWanted.children.values())
				promises.push(textChannelMatches(channel, channelFound));

			if (!(await firstPromiseValued(true, promises))) return false;

			break;
			// else return false;
		}
		case "GUILD_NEWS_THREAD":
		case "GUILD_PUBLIC_THREAD": {
			//	other public thread
			if (
				(typeof channelFound === "string" && channelWanted.id === channelFound) ||
				(typeof channelFound === "object" && channelWanted.id === channelFound.id)
			)
				break;
			else return false;
		}

		default: {
			// It's likely a VC
			return false;
		}
	}

	return true;
}

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Replies with a random message from the potatoboard.")
		.addIntegerOption((input) =>
			input
				.setName("minimum-reactions")
				.setDescription(
					"Filter messages to only get those with at least this many reactions.",
				)
				.setRequired(false)
				.setMinValue(MIN_REACTIONS),
		)
		.addUserOption((input) =>
			input
				.setName("user")
				.setDescription("Filter messages to only get those by a certain user.")
				.setRequired(false),
		)
		.addChannelOption((input) =>
			input
				.setName("channel")
				.setDescription("Filter messages to only get those in a certain channel.")
				.setRequired(false)
				.addChannelTypes([0, 4, 5, 6, 10, 11]),
		),

	async interaction(interaction) {
		if (interaction.guild?.id !== process.env.GUILD_ID) return;

		const deferPromise = interaction.deferReply();
		const board = await interaction.guild?.channels.fetch(BOARD_CHANNEL);

		if (!board?.isText()) {
			throw new Error(
				"No board channel found. Make sure BOARD_CHANNEL is set in the .env file.",
			);
		}

		const minReactions = interaction.options.getInteger("minimum-reactions") || 0;
		const user = interaction.options.getUser("user")?.id;
		const channelId = interaction.options.getChannel("channel")?.id;
		const channelWanted = channelId && (await interaction.guild?.channels.fetch(channelId));
		const [, fetchedMessages] = await Promise.all([
			deferPromise,
			getAllMessages(board).then(
				async (messages) =>
					await asyncFilter(messages, async (message) => {
						if (!message.content || !message.embeds[0] || !message.author.bot)
							return false;

						if ((/\d+/.exec(message.content)?.[0] || 0) < minReactions) return false;

						const source = await boardMessageToSource(message);

						if (
							user &&
							source?.author.id !== user &&
							message.mentions.users.first()?.id !== user
						)
							return false;

						const channelFound = source?.channel || message.mentions.channels.first();

						if (
							channelWanted &&
							channelFound &&
							!(await textChannelMatches(channelWanted, channelFound))
						)
							return false;

						return true;
					}),
			),
		]);

		const nextButton = new MessageButton()
			.setLabel("Next")
			.setCustomId(generateHash("next"))
			.setStyle("SECONDARY")
			.setEmoji("➡");

		/**
		 * Grab a new message from the board.
		 *
		 * @returns {import("discord.js").InteractionReplyOptions} - Reply to post next.
		 */
		function generateMessage() {
			const index = Math.floor(Math.random() * fetchedMessages.length);
			const source = fetchedMessages[+index];

			fetchedMessages.splice(index, 1);

			if (!source?.components[0]?.components[0]) {
				return {
					attachments: [],
					components: [],

					content:
						"<:no:940054047854047282> No messages found. Try changing any filters you may have used.",

					embeds: [],
					ephemeral: true,
				};
			}

			if (fetchedMessages.length === 0) nextButton.setDisabled(true);

			return {
				components: [
					source.components[0]?.components[0]
						? source.components[0]?.setComponents(
								source.components[0].components[0],
								nextButton,
						  )
						: source.components[0],
				],

				content: source.content,
				embeds: source.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
				ephemeral: interaction.channel?.id !== process.env.BOTS_CHANNEL,
				files: source.attachments.map((attachment) => attachment),
			};
		}

		await interaction.editReply(generateMessage());

		const collector = interaction.channel?.createMessageComponentCollector({
			filter: (buttonInteraction) =>
				buttonInteraction.customId === nextButton.customId &&
				buttonInteraction.user.id === interaction.user.id,

			time: 15_000,
		});

		collector
			?.on("collect", async (buttonInteraction) => {
				await Promise.all([
					buttonInteraction.deferUpdate(),
					interaction.editReply(generateMessage()),
				]);
				collector.resetTimer();
			})
			.on("end", async () => {
				const source = await interaction.fetchReply();

				if (!(source instanceof Message)) return;

				await interaction.editReply({
					allowedMentions: { users: [] },

					components: source.components.map((components) =>
						components.setComponents(
							components.components.map(
								(component) =>
									component.setDisabled(
										!(component.type === "BUTTON" && component.url),
									),
								// Disable it if it's not a button with a URL
							),
						),
					),

					content: source.content,
					embeds: source.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
					files: source.attachments.map((attachment) => attachment),
				});
			});
	},
};

export default info;
