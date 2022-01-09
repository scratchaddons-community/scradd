import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";

export const SUGGESTION_CHANNEL = process.env.SUGGESTION_CHANNEL;

/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {{ title: string; description: string }} data
 */
export async function createMessage(interaction, data) {
	const author = await interaction.guild?.members.fetch(interaction.user).catch(() => {});

	const embed = new MessageEmbed()
		.setColor("#222222")
		.setAuthor({
			name: "Suggestion by " + author?.displayName || interaction.user.username,
			iconURL:
				author?.displayAvatarURL() ||
				interaction.user.displayAvatarURL() ||
				interaction.user.defaultAvatarURL ||
				"",
		})
		.setTitle(data.title)
		.setDescription(data.description);

	if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env");
	const channel = await interaction.guild?.channels.fetch(SUGGESTION_CHANNEL);
	if (!channel?.isText()) throw new Error("Suggestion channel not found");
	const message = await channel.send({ embeds: [embed] });
	const thread = await message.startThread({
		name: "Unanswered | " + embed.title,
		autoArchiveDuration: "MAX",
		reason: "Suggestion/report by " + interaction.user.tag,
	});
	await thread.members.add(interaction.user.id);
	return { thread, message };
}

/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {string} answer
 * @param {(answer: string) => import("discord.js").ColorResolvable} getColor
 */
export async function answerSuggestion(interaction, answer, getColor) {
	if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env.");
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
		const embed = new MessageEmbed(message.embeds[0]);
		embed.setColor(getColor(answer));

		message.edit({ embeds: [embed] });
	});

	return true;
}
/** @param {import("discord.js").CommandInteraction} interaction */
export async function deleteSuggestion(interaction) {
	if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env.");
	if (!interaction.guild)
		return interaction.reply({ content: "This command is unavailable in DMs." });
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
			if (
				!interaction.channel?.isThread() ||
				interaction.channel.parentId !== SUGGESTION_CHANNEL
			)
				return i.reply({
					content: `This command can only be used in threads in <#${SUGGESTION_CHANNEL}>.`,
					ephemeral: true,
				});
			interaction.channel.delete();
			const m = await interaction.channel.fetchStarterMessage();
			m.delete();
		} else {
			deleteButton.setDisabled(true);
			cancelButton.setDisabled(true);
			i.reply({
				content: ":negative_squared_cross_mark: Deletion canceled.",
				ephemeral: true,
			});
		}
	});

	collector.on("end", (collected) => {
		if (collected.size !== 0) return;
		deleteButton.setDisabled(true);
		cancelButton.setDisabled(true);
		interaction.editReply({
			content: ":negative_squared_cross_mark: Deletion timed out.",
			components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
		});
	});
}

/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {string} newSuggestion
 *
 * @returns {Promise<boolean>} If true, you must repond to the interaction with a success message yourself.
 */
export async function editSuggestion(interaction, newSuggestion) {
	if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env.");
	if (!interaction.guild) {
		interaction.reply({ content: "The command unavailable in DMs." });
		return false;
	}
	if (!interaction.channel?.isThread() || interaction.channel.parentId !== SUGGESTION_CHANNEL) {
		interaction.reply({
			content: `This command can only be used in threads in <#${SUGGESTION_CHANNEL}>.`,
			ephemeral: true,
		});
		return false;
	}
	const starterMessage = await interaction.channel.fetchStarterMessage();
	const embed = new MessageEmbed(starterMessage.embeds[0]);
	const initingMessages = await interaction.channel.messages.fetch({
		limit: 2,
		after: starterMessage.id,
	});
	const user = initingMessages.first()?.mentions.users.first();
	if (interaction.user.id !== user?.id) {
		interaction.reply({
			content: "You do not have permision to use this command.",
			ephemeral: true,
		});
		return false;
	}

	embed?.setDescription(newSuggestion);
	starterMessage.edit({ embeds: [embed] });
	return true;
}
