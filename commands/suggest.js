import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";

const { SUGGESTION_CHANNEL } = process.env;

const ANSWERS = {
	GOODIDEA: "Good Idea",
	INDEVELOPMENT: "In Development",
	IMPLEMENTED: "Implemented",
	POSSIBLE: "Possible",
	IMPRACTICAL: "Impractical",
	REJECTED: "Rejected",
	IMPOSSIBLE: "Impossible",
};

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Manage and cretae suggestions in #suggestions")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new suggestion")
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription("Title for the suggestion embed")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("suggestion")
						.setDescription("Your suggestion")
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("answer")
				.setDescription("(Devs Only) Answer a suggestion")
				.addStringOption((option) =>
					option
						.setName("answer")
						.setDescription("Answer to the suggestion")
						.addChoice(ANSWERS.GOODIDEA, ANSWERS.GOODIDEA)
						.addChoice(ANSWERS.INDEVELOPMENT, ANSWERS.INDEVELOPMENT)
						.addChoice(ANSWERS.IMPLEMENTED, ANSWERS.IMPLEMENTED)
						.addChoice(ANSWERS.POSSIBLE, ANSWERS.POSSIBLE)
						.addChoice(ANSWERS.IMPRACTICAL, ANSWERS.IMPRACTICAL)
						.addChoice(ANSWERS.REJECTED, ANSWERS.REJECTED)
						.addChoice(ANSWERS.IMPOSSIBLE, ANSWERS.IMPOSSIBLE)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("delete").setDescription("Delete a suggestion"),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand();
		if (command === "create") {
			const embed = new MessageEmbed()
				.setColor("#222222")
				.setAuthor({
					name: "Suggestion by " + interaction.user.tag,
					iconURL: interaction.user.avatarURL() || "",
				})
				.setDescription(interaction.options.getString("suggestion") || "")
				.setTimestamp();

			const title = interaction.options.getString("title") || "";

			embed.setTitle(title);

			if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env");
			const channel = await interaction.guild?.channels.fetch(SUGGESTION_CHANNEL);
			if (channel && "send" in channel) {
				const message = await channel.send({ embeds: [embed] });
				message.react("👍").then(() => message.react("👎"));
				const thread = await message.startThread({
					name: "Unanswered | " + title,
					autoArchiveDuration: "MAX",
					reason: "Suggestion by " + interaction.user.tag,
				});
				await thread.members.add(interaction.user.id);
				await interaction.reply({
					content: ":white_check_mark: Suggestion posted! " + thread.toString(),
					ephemeral: true,
				});
			} else {
				await interaction.reply({
					content: ":negative_squared_cross_mark: Suggestion failed :(",
					ephemeral: true,
				});
			}
		} else if (command === "answer") {
			const answer = interaction.options.getString("answer");
			if (!SUGGESTION_CHANNEL || !answer)
				throw new Error(
					"Either SUGGESTION_CHANNEL is not set in the .env or you did not provide an answer.",
				);
			if (!interaction.guild)
				return interaction.reply({ content: "How would this work in a DM?? 😛" });
			if (
				!interaction.channel?.isThread() ||
				interaction.channel.parentId !== SUGGESTION_CHANNEL
			)
				return interaction.reply({
					content: `This command can only be used in threads in <#${SUGGESTION_CHANNEL}>.`,
					ephemeral: true,
				});

			interaction.channel
				.setName(
					interaction.channel.name.replace(/(.*) \|/i, answer + " |"),
					"Thread answered by " + interaction.user.tag,
				)
				.catch((err) => {
					console.log("e", err);
				});
			interaction.channel.fetchStarterMessage().then(async (message) => {
				/** @type {import("discord.js").ColorResolvable} */
				let color = "DARK_BUT_NOT_BLACK";
				switch (answer) {
					case ANSWERS.GOODIDEA:
						color = "GREEN";
						break;
					case ANSWERS.INDEVELOPMENT:
						color = "YELLOW";
						break;
					case ANSWERS.IMPLEMENTED:
						color = "BLUE";
						break;
					case ANSWERS.POSSIBLE:
						color = "ORANGE";
						break;
					case ANSWERS.IMPRACTICAL:
						color = "DARK_RED";
						break;
					case ANSWERS.REJECTED:
						color = "RED";
						break;
					case ANSWERS.IMPOSSIBLE:
						color = "PURPLE";
						break;
				}
				const [embed] = message.embeds;
				if (!embed)
					return interaction.reply({
						content: "The first message in this thread has no embed!",
						ephemeral: true,
					});
				embed.setColor(color);
				embed.setTitle(embed.title?.replace(/(.*): /i, answer + ": ") || "");

				message.edit({ embeds: message.embeds });
			});

			interaction.reply({
				content: `:white_check_mark: Answered suggestion as ${answer}! Please elaborate on your answer below.`,
				ephemeral: true,
			});
		} else if (command === "delete") {
			if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env.");
			if (!interaction.guild)
				return interaction.reply({ content: "How would this work in a DM?? 😛" });
			if (
				!interaction.channel?.isThread() ||
				interaction.channel.parentId !== SUGGESTION_CHANNEL
			)
				return interaction.reply({
					content: `This command can only be used in threads in <#${SUGGESTION_CHANNEL}>.`,
					ephemeral: true,
				});

			const deleteButton = new MessageButton()
				.setLabel("Delete this suggestion")
				.setCustomId("delete")
				.setStyle("DANGER");
			const cancelButton = new MessageButton()
				.setLabel("Cancel")
				.setCustomId("cancel")
				.setStyle("SECONDARY");

			interaction.reply({
				content: `Are you really sure you want to do this?`,
				components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
				ephemeral: true,
			});

			const collector = interaction.channel.createMessageComponentCollector({
				filter: (i) =>
					["delete", "cancel"].includes(i.customId) && i.user.id === interaction.user.id,
				time: 15000,
			});

			collector.on("collect", async (i) => {
				if (i.customId === "delete") {
					if (!i.channel?.isThread() || i.channel.parentId !== SUGGESTION_CHANNEL) return;
					i.channel.delete();
					const m = await i.channel.fetchStarterMessage();
					m.delete();
				} else {
					deleteButton.setDisabled(true);
					cancelButton.setDisabled(true);
					interaction.editReply({
						content: ":negative_squared_cross_mark: Deletion canceled.",
						components: [
							new MessageActionRow().addComponents(deleteButton, cancelButton),
						],
					});
				}
			});

			collector.on("end", (collected) => {
				if (collected.size === 0) {
					deleteButton.setDisabled(true);
					cancelButton.setDisabled(true);
					interaction.editReply({
						content: ":negative_squared_cross_mark: Deletion timed out.",
						components: [
							new MessageActionRow().addComponents(deleteButton, cancelButton),
						],
					});
				}
			});

			// interaction.channel.delete("Suggestion deleted by " + interaction.user.tag);
		}
	},
};

export default info;
