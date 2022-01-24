import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import getAllMessages from "../lib/getAllMessages.js";
import dotenv from "dotenv";
import generateHash from "../lib/generateHash.js";

dotenv.config();

const PAGE_OFFSET = 15;

const { SUGGESTION_CHANNEL } = process.env;
if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env.");

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder().setDescription("Gets the top suggestions from #suggestions."),
	async interaction(interaction) {
		if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env");
		const channel = await interaction.guild?.channels.fetch(SUGGESTION_CHANNEL);
		if (!channel?.isText()) return;
		const all = (
			await getAllMessages(channel, (message) => !!message.reactions.valueOf().size)
		).map(async (message) => {
			const count =
				(message.reactions.resolve("👍")?.count || 0) -
				(message.reactions.resolve("👎")?.count || 0);

			return {
				id: message.id,
				count,
				title: message.embeds[0]?.title || "",
				thread: message.thread,
			};
		});

		const filtered = (await Promise.all(all)).sort((a, b) => b.count - a.count);

		if (!interaction.channel?.isText()) return;

		const previousButton = new MessageButton()
			.setLabel("<< Previous")
			.setStyle("PRIMARY")
			.setDisabled(true)
			.setCustomId(generateHash("previous"));
		const nextButton = new MessageButton()
			.setLabel("Next >>")
			.setStyle("PRIMARY")
			.setCustomId(generateHash("next"));

		let offset = 0;
		const embed = async () => {
			const content = filtered
				.filter((_, i) => i > offset && i <= offset + PAGE_OFFSET)
				.map(async (x, i) => {
					const author =
						x.thread &&
						(
							await x.thread?.messages.fetch({
								limit: 2,
								after: (await x.thread.fetchStarterMessage()).id,
							})
						)
							?.first()
							?.mentions.users.first()
							?.toString();
					return (
						`${i + offset + 1}. **${x.count}** [👍 ${
							x.title
						}](https://discord.com/channels/${
							process.env.GUILD_ID
						}/${SUGGESTION_CHANNEL}/${x.id})` + (author ? ` by ${author}` : ``)
					);
				});

			return new MessageEmbed()
				.setTitle("Top suggestions")
				.setDescription((await Promise.all(content)).join("\n"));
		};

		interaction.reply({
			embeds: [await embed()],
			components: [new MessageActionRow().addComponents(previousButton, nextButton)],
		});

		const collector = interaction.channel.createMessageComponentCollector({
			filter: (i) =>
				[previousButton.customId, nextButton.customId].includes(i.customId) &&
				i.user.id === interaction.user.id,
			time: 10_000,
		});

		collector
			.on("collect", async (i) => {
				if (!interaction.channel?.isText()) return;
				if (i.customId === nextButton.customId) {
					offset += PAGE_OFFSET;
				} else {
					offset -= PAGE_OFFSET;
				}
				if (offset === 0) previousButton.setDisabled(true);
				else previousButton.setDisabled(false);
				if (offset + PAGE_OFFSET >= filtered.length - 1) nextButton.setDisabled(true);
				else nextButton.setDisabled(false);
				interaction.editReply({
					embeds: [await embed()],
					components: [new MessageActionRow().addComponents(previousButton, nextButton)],
				});
				i.deferUpdate();
				collector.resetTimer();
			})
			.on("end", async () => {
				previousButton.setDisabled(true);
				nextButton.setDisabled(true);
				interaction.editReply({
					embeds: (await interaction.fetchReply()).embeds.map(
						(oldEmbed) => new MessageEmbed(oldEmbed),
					),
					components: [new MessageActionRow().addComponents(previousButton, nextButton)],
				});
			});
	},
};

export default info;
