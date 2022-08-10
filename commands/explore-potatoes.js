import { SlashCommandBuilder } from "@discordjs/builders";
import { Message, MessageButton, MessageEmbed, MessageMentions, Channel } from "discord.js";
import { ChannelType } from "discord-api-types/v9";

import { BOARD_CHANNEL, MIN_REACTIONS } from "../common/board.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { asyncFilter, firstTrueyPromise } from "../lib/promises.js";
import { generateHash } from "../lib/text.js";
import { getAllMessages } from "../lib/message.js";

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
		const deferPromise = interaction.deferReply({
			ephemeral: interaction.channel?.id !== process.env.BOTS_CHANNEL,
		});
		const board = await interaction.guild?.channels.fetch(BOARD_CHANNEL);

		if (!board?.isText()) {
			throw new ReferenceError("Could not find board channel.");
		}

		const minReactions = interaction.options.getInteger("minimum-reactions") ?? 0;
		const user = interaction.options.getUser("user")?.id;
		const channelWanted = interaction.options.getChannel("channel");
		const [, fetchedMessages] = await Promise.all([
			deferPromise,
			getAllMessages(board).then((messages) =>
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
						if (
							user &&
							message.content.match(MessageMentions.USERS_PATTERN)?.[1] !== user
						)
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
			),
		]);

		const nextButton = new MessageButton()
			.setLabel("Next")
			.setCustomId(generateHash("next"))
			.setStyle("SECONDARY")
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
			if (!current?.components[0]?.components[0]) {
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

			if (!source?.components[0]?.components[0]) nextButton.setDisabled(true);

			return {
				allowedMentions: { users: [] },

				components: [
					current.components[0]?.components[0]
						? current.components[0]?.setComponents(
								current.components[0].components[0],
								nextButton,
						  )
						: current.components[0],
				],

				content: current.content,
				embeds: current.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
				ephemeral: interaction.channel?.id !== process.env.BOTS_CHANNEL,
				files: current.attachments.map((attachment) => attachment),
			};
		}

		await interaction.editReply(await generateMessage(source));

		const collector = interaction.channel?.createMessageComponentCollector({
			filter: (buttonInteraction) =>
				buttonInteraction.customId === nextButton.customId &&
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

				if (!(source instanceof Message)) throw new TypeError("Source is not a message.");

				await interaction.editReply({
					allowedMentions: { users: [] },

					components: source.components.map((components) =>
						components.setComponents(
							components.components.map(
								(component) =>
									component.setDisabled(
										!(component.type === "BUTTON" && component.url),
									),
								// Disable it if it’s not a button with a URL
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
