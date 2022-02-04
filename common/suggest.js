import { GuildMember, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import generateHash from "../lib/generateHash.js";
export const MAX_TITLE_LENGTH = 50;

export default class SuggestionBuilder {
	CHANNEL_ID = "";

	/** @param {string} CHANNEL_ID */
	constructor(CHANNEL_ID) {
		this.CHANNEL_ID = CHANNEL_ID;
	}

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 * @param {{ title: string; description: string; type: "Suggestion" | "Report" }} data
	 */
	async createMessage(interaction, data) {
		const author = interaction.member;
		if (!(author instanceof GuildMember)) return;

		if (data.title.length > MAX_TITLE_LENGTH) {
			interaction.reply({
				content: `The title can not be longer than ` + MAX_TITLE_LENGTH + ` characters.`,
				ephemeral: true,
			});
			return false;
		}

		const embed = new MessageEmbed()
			.setColor(0x222_222)
			.setAuthor({
				name: data.type + " from " + author?.displayName || interaction.user.username,
				iconURL:
					author?.displayAvatarURL() ||
					interaction.user.displayAvatarURL() ||
					interaction.user.defaultAvatarURL ||
					"",
			})
			.setTitle(data.title)
			.setDescription(data.description)
			.setFooter({ text: "Unanswered" });

		const channel = await interaction.guild?.channels.fetch(this.CHANNEL_ID);
		if (!channel?.isText()) throw new Error("Suggestion channel not found");
		const message = await channel.send({ embeds: [embed] });
		const thread = await message.startThread({
			name: "Unanswered | " + embed.title,
			autoArchiveDuration: 1440,
			reason: "Suggestion/report by " + interaction.user.tag,
		});
		await thread.members.add(interaction.user.id);
		return { thread, message };
	}

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 * @param {string} answer
	 * @param {{ [key: string]: import("discord.js").ColorResolvable }} colors
	 *
	 * @returns {Promise<boolean>} - If true, you must repond to the interaction with a success
	 *   message yourself.
	 */
	async answerSuggestion(interaction, answer, colors) {
		if (!interaction.guild) {
			await interaction.reply({ content: "Command unavailable in DMs." });
			return false;
		}
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID) {
			interaction.reply({
				content: `This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});
			return false;
		}
		const roles = (await interaction.guild.members.fetch(interaction.user?.id)).roles.valueOf();

		if (!roles.has(process.env.DEVELOPER_ROLE || "")) {
			interaction.reply({
				content: "You don't have permission to run this command!",
				ephemeral: true,
			});
			return false;
		}

		await Promise.all([
			interaction.channel.setName(
				interaction.channel.name.replace(/^[^|]+?(?=( \| .+)?$)/i, answer),
				"Thread answered by " + interaction.user.tag,
			),

			await interaction.channel.fetchStarterMessage().then(async (message) => {
				if (message.author.id !== interaction.client.user?.id) return;
				const embed = new MessageEmbed(message.embeds[0]);
				embed.setColor(colors[answer] || 0x000).setFooter({ text: answer });

				message.edit({ embeds: [embed] });
			}),
		]);
		return true;
	}

	/** @param {import("discord.js").CommandInteraction} interaction */
	async deleteSuggestion(interaction) {
		if (!interaction.guild)
			return interaction.reply({ content: "This command is unavailable in DMs." });
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID)
			return interaction.reply({
				content: `This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});
		const starter = await interaction.channel.fetchStarterMessage().catch(() => {});
		const user =
			starter &&
			(
				await interaction.channel?.messages.fetch({
					limit: 2,
					after: starter.id,
				})
			)
				?.first()
				?.mentions.users.first();

		const roles = (await interaction.guild.members.fetch(interaction.user?.id)).roles.valueOf();

		if (
			!(
				roles.hasAny(process.env.MODERATOR_ROLE || "", process.env.DEVELOPER_ROLE || "") ||
				(user && interaction.user.id === user?.id)
			)
		) {
			return interaction.reply({
				content: "You don't have permission to run this command!",
				ephemeral: true,
			});
		}

		const deleteButton = new MessageButton()
			.setLabel("Delete")
			.setCustomId(generateHash("delete"))
			.setStyle("DANGER");
		const cancelButton = new MessageButton()
			.setLabel("Cancel")
			.setCustomId(generateHash("cancel"))
			.setStyle("SECONDARY");

		await interaction.reply({
			content: `Are you really sure you want to do this?`,
			components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
			ephemeral: true,
		});

		interaction.channel
			.createMessageComponentCollector({
				filter: (i) =>
					[deleteButton.customId, cancelButton.customId].includes(i.customId) &&
					i.user.id === interaction.user.id,
				time: 15_000,
			})
			.on("collect", async (i) => {
				switch (i.customId) {
					case deleteButton.customId: {
						if (
							!interaction.channel?.isThread() ||
							interaction.channel.parentId !== this.CHANNEL_ID
						)
							return i.reply({
								content: `This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
								ephemeral: true,
							});
						interaction.channel.delete();
						starter?.delete();
						break;
					}
					case cancelButton.customId: {
						deleteButton.setDisabled(true);
						cancelButton.setDisabled(true);
						i.deferUpdate();
						interaction.editReply({
							content: ":negative_squared_cross_mark: Deletion canceled.",
							components: [
								new MessageActionRow().addComponents(deleteButton, cancelButton),
							],
						});
						break;
					}
				}
			})
			.on("end", (collected) => {
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
	 * @param {{ title: null | string; body: null | string }} newSuggestion
	 *
	 * @returns {Promise<boolean>} - If true, you must repond to the interaction with a success
	 *   message yourself.
	 */
	async editSuggestion(interaction, newSuggestion) {
		if (!interaction.guild) {
			interaction.reply({ content: "The command is unavailable in DMs." });
			return false;
		}
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID) {
			interaction.reply({
				content: `This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});
			return false;
		}
		const starterMessage = await interaction.channel.fetchStarterMessage();
		if (starterMessage.author.id !== interaction.client.user?.id) {
			interaction.reply({
				content: "This suggestion can not be edited.",
				ephemeral: true,
			});
			return false;
		}
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

		if (newSuggestion.body) embed?.setDescription(newSuggestion.body);
		if (newSuggestion.title) {
			interaction.channel.setName(
				interaction.channel.name.replace(/(?<=^.+ \| )(.+)$/i, newSuggestion.title),
				"Suggestion/report edited",
			);
			embed?.setTitle(newSuggestion.title);
		}
		starterMessage.edit({ embeds: [embed] });
		return true;
	}
}
