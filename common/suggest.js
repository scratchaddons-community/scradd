import { MessageActionRow, MessageButton } from "discord.js";

const SUGGESTION_CHANNEL = process.env.SUGGESTION_CHANNEL;

/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {import("discord.js").MessageEmbed} embed
 */
export async function createMessage(interaction, embed) {
	if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env");
	const channel = await interaction.guild?.channels.fetch(SUGGESTION_CHANNEL);
	if (channel && "send" in channel) {
		const message = await channel.send({ embeds: [embed] });
		message.react("👍").then(() => message.react("👎"));
		const thread = await message.startThread({
			name: "Unanswered | " + embed.title,
			autoArchiveDuration: "MAX",
			reason: "Bug report by " + interaction.user.tag,
		});
		await thread.members.add(interaction.user.id);
		await interaction.reply({
			content: ":white_check_mark: Bug report posted! " + thread.toString(),
			ephemeral: true,
		});
	} else {
		await interaction.reply({
			content: ":negative_squared_cross_mark: Bug report failed :(",
			ephemeral: true,
		});
	}
}

/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {string | null} answer
 * @param {(answer: string) => import("discord.js").ColorResolvable} getColor
 *
 * @returns {Promise<boolean>}
 */
export async function answerSuggestion(interaction, answer, getColor) {
	if (!SUGGESTION_CHANNEL || !answer)
		throw new Error("SUGGESTION_CHANNEL is not set in the .env.");
	if (!answer) throw new Error("Answer not provided");
	if (!interaction.guild) {
		interaction.reply({ content: "Command unavailable in DMs." });
		return false;
	}
	if (!interaction.channel?.isThread() || interaction.channel.parentId !== SUGGESTION_CHANNEL) {
		interaction.reply({
			content: `This command can only be used in threads in <#${SUGGESTION_CHANNEL}>.`,
			ephemeral: true,
		});
		return false;
	}

	interaction.channel.setName(
		interaction.channel.name.replace(/(.*) \|/i, answer + " |"),
		"Thread answered by " + interaction.user.tag,
	);
	interaction.channel.fetchStarterMessage().then(async (message) => {
		const [embed] = message.embeds;
		if (!embed) {
			interaction.reply({
				content: "The first message in this thread has no embed!",
				ephemeral: true,
			});
			return;
		}
		embed.setColor(getColor(answer));
		embed.setTitle(embed.title?.replace(/(.*): /i, answer + ": ") || "");

		message.edit({ embeds: message.embeds });
	});

	return true;
}
/** @param {import("discord.js").CommandInteraction} interaction */
export async function deleteSuggestion(interaction) {
	if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env.");
	if (!interaction.guild) return interaction.reply({ content: "Command unavailable in DMs." });
	if (!interaction.channel?.isThread() || interaction.channel.parentId !== SUGGESTION_CHANNEL)
		return interaction.reply({
			content: `This command can only be used in threads in <#${SUGGESTION_CHANNEL}>.`,
			ephemeral: true,
		});

	const deleteButton = new MessageButton()
		.setLabel("Delete")
		.setCustomId("delete")
		.setStyle("DANGER");
	const cancelButton = new MessageButton()
		.setLabel("Cancel")
		.setCustomId("delete-cancel")
		.setStyle("SECONDARY");

	interaction.reply({
		content: `Are you really sure you want to do this?`,
		components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
		ephemeral: true,
	});

	const collector = interaction.channel.createMessageComponentCollector({
		filter: (i) =>
			["delete", "delete-cancel"].includes(i.customId) && i.user.id === interaction.user.id,
		time: 15000,
	});

	collector.on("collect", async (i) => {
		if (i.customId === "delete-cancel") {
			if (!i.channel?.isThread() || i.channel.parentId !== SUGGESTION_CHANNEL) return;
			i.channel.delete();
			const m = await i.channel.fetchStarterMessage();
			m.delete();
		} else {
			deleteButton.setDisabled(true);
			cancelButton.setDisabled(true);
			interaction.editReply({
				content: ":negative_squared_cross_mark: Deletion canceled.",
				components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
			});
		}
	});

	collector.on("end", (collected) => {
		if (collected.size === 0) {
			deleteButton.setDisabled(true);
			cancelButton.setDisabled(true);
			interaction.editReply({
				content: ":negative_squared_cross_mark: Deletion timed out.",
				components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
			});
		}
	});
}

/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {string} newSuggestion
 */
export async function editSuggestion(interaction, newSuggestion) {
	if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env.");
	if (!interaction.guild) return interaction.reply({ content: "Command unavailable in DMs." });
	if (!interaction.channel?.isThread() || interaction.channel.parentId !== SUGGESTION_CHANNEL)
		return interaction.reply({
			content: `This command can only be used in threads in <#${SUGGESTION_CHANNEL}>.`,
			ephemeral: true,
		});
	console.log(
		interaction.user.id,
		(await interaction.channel.fetchStarterMessage()).embeds[0]?.footer?.text,
	);
	if (
		interaction.user.id !==
		(await interaction.channel.fetchStarterMessage()).embeds[0]?.footer?.text
	)
		return interaction.reply({
			content: "You do not have permision to use this command.",
			ephemeral: true,
		});

	const deleteButton = new MessageButton()
		.setLabel("Edit")
		.setCustomId("edit")
		.setStyle("PRIMARY");
	const cancelButton = new MessageButton()
		.setLabel("Cancel")
		.setCustomId("edit-cancel")
		.setStyle("SECONDARY");

	interaction.reply({
		content: `Are you really sure you want to do this?`,
		components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
		ephemeral: true,
	});

	const collector = interaction.channel.createMessageComponentCollector({
		filter: (i) =>
			["edit", "edit-cancel"].includes(i.customId) && i.user.id === interaction.user.id,
		time: 15000,
	});

	collector.on("collect", async (i) => {
		if (i.customId === "edit") {
			if (!i.channel?.isThread() || i.channel.parentId !== SUGGESTION_CHANNEL) return;
			const m = await i.channel.fetchStarterMessage();
			m.embeds[0]?.setDescription(newSuggestion);
			m.edit({ embeds: m.embeds });
			interaction.editReply({
				content: "Sucessfully editted.",
			});
		} else {
			deleteButton.setDisabled(true);
			cancelButton.setDisabled(true);
			interaction.editReply({
				content: ":negative_squared_cross_mark: Edittion canceled.",
				components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
			});
		}
	});

	collector.on("end", (collected) => {
		if (collected.size === 0) {
			deleteButton.setDisabled(true);
			cancelButton.setDisabled(true);
			interaction.editReply({
				content: ":negative_squared_cross_mark: Edittion timed out.",
				components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
			});
		}
	});
}
