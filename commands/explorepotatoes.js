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

	async interaction(_interaction) {
		// Never name a param in a function the name of the same function, you'll run into tricky bugs
		if (_interaction.guild?.id !== process.env.GUILD_ID) return;
		const deferPromise = _interaction.deferReply();
		const board = await _interaction.guild?.channels.fetch(BOARD_CHANNEL);
		if (!board?.isText())
			throw new Error(
				"No board channel found. Make sure BOARD_CHANNEL is set in the .env file.",
			);

		const minReactions = _interaction.options.getInteger("minimum-reactions") || 0;
		const user = _interaction.options.getUser("user")?.id;
		const channelId = _interaction.options.getChannel("channel")?.id;
		const channelWanted = channelId && (await _interaction.guild?.channels.fetch(channelId));
		const [, fetchedMessages] = await Promise.all([
			deferPromise,
			// Organize code a bit
			_getMessages(board)
		]);
		// Shuffle
		fetchedMessages = fetchedMessages.sort(() => 0.5 - Math.random())
		const nextButton = new MessageButton()
			.setLabel("Next")
			.setCustomId(generateHash("next"))
			.setStyle("SECONDARY")
			.setEmoji("➡");

		const backButton = new MessageButton()
			.setLabel("Back")
			.setStyle("SECONDARY")
			.setCustomId(generateHash("back"))
			.setStyle("SECONDARY")
			.setEmoji("⬅️");
		
		/**
		* Generates a message from the given index in the `fetchedMessages` array. 
		* @param {Integer} index The index in the `fetchedMessages` array. Can go over or under the actual length.
		* @returns {import("discord.js")._InteractionReplyOptions}
		*/
		function generateMessage(index) {
			// Loop array, javascript array indexes start at 0 so that's why -1
			index = index % (fetchedMessages.length - 1);
			const source = fetchedMessages[index];
			if (!source?.components[0]?.components[0]) {
				return {
					content: "No messages found. Try changing any filters you may have used.",
					ephemeral: true,
					embeds: [],
					attachments: [],
					components: [],
					allowedMentions: { users: [] },
				};
			}
			if (!fetchedMessages.length) nextButton.setDisabled(true);
			return {
				ephemeral: false,
				content: source.content,
				embeds: source.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
				files: source.attachments.map((a) => a),
				components: [
					source.components[0]?.components[0]
						? source.components[0]?.setComponents(
								source.components[0].components[0],
								backButton,
								nextButton
						  )
						: source.components[0],
				],
				allowedMentions: { users: [] },
			};
		}
		// First messsage
		await _interaction.editReply(generateMessage(0));
		// Declare index here, not sure if this needs some sort of persistent storage or not
		let index = 0;
		// Collectors

		collector(nextButton.customId, 1);
		collector(backButton.customId, -1);
		/**
		 * Creates a collector
		 * @param {*} buttonID The ID of the button
		 * @param {Integer} direction The number of messages to go through (1 for forwards, -1 for backwards, etc)
		 * @returns {Collector} Collector object
		 */
		function collector(buttonID, direction = 1){
			const _collector = _interaction.channel?.createMessageComponentCollector({
				// use backButton
				filter: (i) => i.customId === buttonID && i.user.id === _interaction.user.id,
				time: 15_000,
			});
			if (!_collector){
				console.trace();
				throw new Error("Something went wrong, no collector object.")
			}
			_collector.on("collect", async (i) => {
				await i.deferUpdate();
				index += direction;
				_interaction.editReply(generateMessage(index));
				_collector.resetTimer();
			}).on("end", onEnd);
			// When the collector ends
			async function onEnd(){
				const source = await _interaction.fetchReply();
				if (!(source instanceof Message)) return _interaction.deleteReply();

				_interaction.editReply({
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
			}
			return _collector;
		}


		function _getMessages(board){
			return getAllMessages(board).then((messages) =>
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
			)
		}
	},
};

export default info;
