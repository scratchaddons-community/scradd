import { SlashCommandBuilder } from "@discordjs/builders";
import { SUGGESTION_CHANNEL } from "../common/suggest.js";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import getAllMessages from "../lib/getAllMessages";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder().setDescription("Gets the top suggestions from #suggestions."),
	async interaction(interaction) {
		if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env");
		const channel = await interaction.guild?.channels.fetch(SUGGESTION_CHANNEL);
		if (!channel?.isText()) return;
const all = await getAllMessages(channel);
		/** @type {{
				id: string,
				count:number,
				title: string,
			}[]} */
		const filtered = [];
		for (const message of all) {
			const count = message.reactions.resolve("👍")?.count;
			if (!count) continue;
			filtered.push({
				id: message.id,
				count,
				title: message.embeds[0]?.title||'',
			});
		}

		if (!interaction.channel?.isText()) return;

		const previousButton = new MessageButton()
			.setLabel("<< Previous")
			.setStyle("PRIMARY")
			.setDisabled(true)
			.setCustomId("previous");
		const nextButton = new MessageButton()
			.setLabel("Next >>")
			.setStyle("PRIMARY")
			.setCustomId("next");

		let offset = 0;
		const embed = () =>
			new MessageEmbed().setTitle("Top suggestions").setDescription(
				filtered
					.sort((a, b) => b.count - a.count)
					.filter((_, i) => i > offset && i <= offset + 10)
					.map(
						(x, i) =>
							`${i + offset + 1}. **${x.count} 👍** [${
								x.title
							}](https://discordapp.com/channels/${
								interaction.guild?.id
							}/${SUGGESTION_CHANNEL}/${x.id})`,
					)
					.join("\n"),
			);

		interaction.reply({
			embeds: [embed()],
			components: [new MessageActionRow().addComponents(previousButton, nextButton)],
		});

		const collector = interaction.channel.createMessageComponentCollector({
			filter: (i) =>
				["previous", "next"].includes(i.customId) && i.user.id === interaction.user.id,
			time: 10000,
		});

		collector.on("collect", async (i) => {
			if (!interaction.channel?.isText()) return;
			if (i.customId === "next") {
				offset += 10;
			} else {
				offset -= 10;
			}
			if (offset === 0) previousButton.setDisabled(true);
			else previousButton.setDisabled(false);
			console.log(offset, filtered.length);
			if (offset + 10 >= filtered.length - 1) nextButton.setDisabled(true);
			else nextButton.setDisabled(false);
			interaction.editReply({
				embeds: [embed()],
				components: [new MessageActionRow().addComponents(previousButton, nextButton)],
			});
			i.deferUpdate();
			collector.resetTimer();
		});

		collector.on("end", () => {
			previousButton.setDisabled(true);
			nextButton.setDisabled(true);
			interaction.editReply({
				embeds: [embed()],
				components: [new MessageActionRow().addComponents(previousButton, nextButton)],
			});
		});
	},
};

export default info;
