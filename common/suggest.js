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
	 * @param {{ title: string; description: string; type: string; category: string }} data
	 */
	async createMessage(interaction, data) {
		const author = interaction.member;
		if (!(author instanceof GuildMember)) return;

		if (data.category.startsWith("Server ")) {
			interaction.reply({
				content:
					`<:no:940054047854047282> In an effort to help SA developers find meaningful suggestions, we have disabled server-related suggestions and bug reports. Now, when a developer looks in <#${process.env.SUGGESTION_CHANNEL}>, they can see suggestions for SA that they can make. ` +
					(data.category.endsWith(" bug")
						? `If I have a bug or the server has a mistake, please send me a DM to let the mods know.`
						: `If you have a suggestion to improve me or the server, please post it in <#806602307750985803> for discussion.`),
				ephemeral: true,
			});
			return false;
		}

		if (data.title.length > MAX_TITLE_LENGTH) {
			interaction.reply({
				content:
					`<:no:940054047854047282> The title can not be longer than ` +
					MAX_TITLE_LENGTH +
					` characters.`,
				ephemeral: true,
			});
			return false;
		}

		const embed = new MessageEmbed()
			.setColor(0x222)
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
			.setFooter({ text: data.category + " • Unanswered" });

		const channel = await interaction.guild?.channels.fetch(this.CHANNEL_ID);
		if (!channel?.isText()) throw new Error(data.type + " channel not found");
		const message = await channel.send({ embeds: [embed] });
		const thread = await message.startThread({
			name: "Unanswered | " + embed.title,
			autoArchiveDuration: 1440,
			reason: data.type + " by " + interaction.user.tag,
		});
		await thread.members.add(interaction.user.id);
		return { thread, message };
	}

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 * @param {string} answer
	 * @param {{ [key: string]: import("discord.js").ColorResolvable }} colors
	 *
	 * @returns {Promise<boolean>} - If true, you must respond to the interaction with a success
	 *   message yourself.
	 */
	async answerSuggestion(interaction, answer, colors) {
		if (!interaction.guild) {
			await interaction.reply({
				content: "<:no:940054047854047282> Command unavailable in DMs.",
			});
			return false;
		}
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID) {
			interaction.reply({
				content: `<:no:940054047854047282> This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});
			return false;
		}
		if (interaction.channel.archived) interaction.channel.setArchived(false,"Thread answered by " + interaction.user.tag);
		const roles = (await interaction.guild.members.fetch(interaction.user?.id)).roles.valueOf();

		if (!roles.has(process.env.DEVELOPER_ROLE || "")) {
			interaction.reply({
				content: "<:no:940054047854047282> You don't have permission to run this command!",
				ephemeral: true,
			});
			return false;
		}

		await Promise.all([
			interaction.channel.setName(
				interaction.channel.name.replace(/^[^|]+?(?=( \| .+)?$)/i, answer),
				"Thread answered by " + interaction.user.tag,
			),

			interaction.channel
				.fetchStarterMessage()
				.catch(() => {})
				.then(async (message) => {
					if (!message || message.author.id !== interaction.client.user?.id) return;
					const embed = new MessageEmbed(message.embeds[0]);
					const category = embed.footer?.text.split(" • ")[0];
					embed
						.setColor(colors[answer] || 0x000)
						.setFooter({ text: (category ? category + " • " : "") + answer });

					message.edit({ embeds: [embed] });
				}),
		]);
		return true;
	}

	/** @param {import("discord.js").CommandInteraction} interaction */
	async deleteSuggestion(interaction) {
		if (!interaction.guild)
			return interaction.reply({
				content: "<:no:940054047854047282> This command is unavailable in DMs.",
			});
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID)
			return interaction.reply({
				content: `<:no:940054047854047282> This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
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
				content: "<:no:940054047854047282> You don't have permission to run this command!",
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
								content: `<:no:940054047854047282> This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
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
							content: "<:no:940054047854047282> Deletion canceled.",
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
					content: "<:no:940054047854047282> Deletion timed out.",
					components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
				});
			});
	}

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 * @param {{ title: null | string; body: null | string; category: null | string }} newSuggestion
	 *
	 * @returns {Promise<boolean>} - If true, you must respond to the interaction with a success
	 *   message yourself.
	 */
	async editSuggestion(interaction, newSuggestion) {
		if (!interaction.guild) {
			interaction.reply({
				content: "<:no:940054047854047282> The command is unavailable in DMs.",
			});
			return false;
		}
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID) {
			interaction.reply({
				content: `<:no:940054047854047282> This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});
			return false;
		}
		if (interaction.channel.archived) interaction.channel.setArchived(false,"Thread edited");
		const starterMessage = await interaction.channel.fetchStarterMessage().catch(() => {});
		if (!starterMessage || starterMessage.author.id !== interaction.client.user?.id) {
			interaction.reply({
				content: "<:no:940054047854047282> This suggestion can not be edited.",
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
				content: "<:no:940054047854047282> You do not have permission to use this command.",
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
		if (newSuggestion.category) {
			const answer = embed.footer?.text.split(" • ").at(-1);
			embed.setFooter({ text: newSuggestion.category + " • " + answer });
		}
		starterMessage.edit({ embeds: [embed] });
		return true;
	}
}
