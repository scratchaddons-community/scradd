import { SlashCommandBuilder } from "@discordjs/builders";
import { Message, MessageButton, MessageEmbed, ThreadChannel } from "discord.js";
import { BOARD_CHANNEL, MIN_REACTIONS } from "../common/board.js";
import firstPromiseWithValue from "../lib/firstPromiseWithValue.js";
import generateHash from "../lib/generateHash.js";
import getAllMessages from "../lib/getAllMessages.js";
import dotenv from "dotenv";
import asyncFilter from "../lib/asyncFilter.js";
dotenv.config();

/** @type {{ [key: string]: { [key: string]: boolean } }} */
const threadsFound = {};
/**
 * @param {import("discord.js").NonThreadGuildBasedChannel | ThreadChannel} channelWanted
 * @param {import("discord.js").TextBasedChannel | string} channelFound
 *
 * @returns
 */
async function textChannelMatchesChannel(channelWanted, channelFound) {
	switch (channelWanted.type) {
		case "GUILD_TEXT":
		case "GUILD_NEWS": {
			// text
			if (typeof channelFound === "string") {
				// We likely found an archived thread. We have the id insted of the channel object.
				// Try to see if we can find it by name instead of checking parentId.
				if (threadsFound[channelWanted.id]?.[channelFound] !== undefined)
					return !!threadsFound[channelFound];

				const thread = (
					await channelWanted?.threads.fetchArchived({
						limit: 2,
						before: channelFound,
					})
				).threads.first();
				threadsFound[channelWanted.id] = {
					...(threadsFound[channelWanted.id] || {}),
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
			for (const channel of channelWanted.children.values()) {
				promises.push(textChannelMatchesChannel(channel, channelFound));
			}

			if (!(await firstPromiseWithValue(true, promises))) return false;

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
			// it's likely a VC
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
		if (!board?.isText())
			throw new Error(
				"No board channel found. Make sure BOARD_CHANNEL is set in the .env file.",
			);

		const minReactions = interaction.options.getInteger("minimum-reactions") || 0;
		const user = interaction.options.getUser("user")?.id;
		const channelId = interaction.options.getChannel("channel")?.id;
		const channelWanted = channelId && (await interaction.guild?.channels.fetch(channelId));
		const [, fetchedMessages] = await Promise.all([
			deferPromise,
			getAllMessages(board).then((messages) =>
				asyncFilter(messages, async (message) => {
					if (!message.content || !message.embeds[0] || !message.author.bot) return false;
					if ((message.content.match(/\d+/)?.[0] || 0) < minReactions) return false;
					if (user && message.mentions.users.first()?.id !== user) return false;

					if (channelWanted) {
						const matchResult = message.content.match(/<#(\d+)>/g);
						const channelFound = message.mentions.channels.first() || matchResult?.[1];

						if (
							!(
								channelFound &&
								(await textChannelMatchesChannel(channelWanted, channelFound))
							)
						) {
							return false;
						}
					}
					return true;
				}),
			),
		]);

		const nextButton = new MessageButton()
			.setLabel("Next")
			.setCustomId(generateHash("next"))
			.setStyle("SECONDARY")
			.setEmoji("➡");

		/** @returns {import("discord.js").InteractionReplyOptions} */
		function generateMessage() {
			const index = Math.floor(Math.random() * fetchedMessages.length);
			const source = fetchedMessages[index];
			fetchedMessages.splice(index, 1);
			if (!source?.components[0]?.components[0]) {
				return {
					content:
						"<:no:940054047854047282> No messages found. Try changing any filters you may have used.",
					ephemeral: true,
					embeds: [],
					attachments: [],
					components: [],
					allowedMentions: { users: [] },
				};
			}
			if (!fetchedMessages.length) nextButton.setDisabled(true);
			return {
				ephemeral: interaction.channel?.id !== process.env.BOTS_CHANNEL,
				content: source.content,
				embeds: source.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
				files: source.attachments.map((a) => a),
				components: [
					source.components[0]?.components[0]
						? source.components[0]?.setComponents(
								source.components[0].components[0],
								nextButton,
						  )
						: source.components[0],
				],
				allowedMentions: { users: [] },
			};
		}

		await interaction.editReply(generateMessage());

		const collector = interaction.channel?.createMessageComponentCollector({
			filter: (i) => i.customId === nextButton.customId && i.user.id === interaction.user.id,
			time: 15_000,
		});

		collector
			?.on("collect", async (i) => {
				await i.deferUpdate();
				interaction.editReply(generateMessage());
				collector.resetTimer();
			})
			.on("end", async () => {
				const source = await interaction.fetchReply();
				if (!(source instanceof Message)) return interaction.deleteReply();

				interaction.editReply({
					content: source.content,
					embeds: source.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
					files: source.attachments.map((a) => a),
					components: source.components.map((components) =>
						components.setComponents(
							components.components.map(
								(component) =>
									component.setDisabled(
										!(component.type === "BUTTON" && component.url),
									),
								// disable it if it's not a button with a URL
							),
						),
					),
					allowedMentions: { users: [] },
				});
			});
	},
};

export default info;
