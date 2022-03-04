/** @file Code Shared between suggestions and bug reports. */
import {
	GuildMember,
	Message,
	MessageActionRow,
	MessageButton,
	MessageEmbed,
	ThreadChannel,
} from "discord.js";

import generateHash from "../lib/generateHash.js";
import CONSTANTS from "./CONSTANTS.js";

/**
 * @typedef {{
 * 	description: string;
 * 	editableTo?: boolean;
 * 	color: import("discord.js").ColorResolvable;
 * 	name: string;
 * }[]} Answers
 */
export const MAX_TITLE_LENGTH = 50;

/** @type {[string, string][]} */
export const SUGGESTION_EMOJIS = [
	["👍", "👎"],
	["575851403558256642", "575851403600330792"],
	["✅", "613912745699442698"],
	["613912747578621952", "613912747440209930"],
	["613912747612045322", "613913094984564736"],
	["613912745837985832", "613912745691054080"],
	["😀", "😔"],
	["❤", "💔"],
	["749005259682086964", "749005284403445790"],
];

/**
 * Get the member who created the suggestion.
 *
 * @param {ThreadChannel} thread - The suggestion thread.
 * @param {Message} [starter] - The starter message.
 *
 * @returns {Promise<GuildMember | undefined>} - The member.
 */
export async function getUserFromThread(thread, starter) {
	const starterMessage = starter || (await thread?.fetchStarterMessage().catch(() => {}));

	if (!starterMessage) return;

	const initingMessages = await thread?.messages.fetch({
		after: starterMessage.id,
		limit: 2,
	});
	const message = initingMessages?.first();

	return message?.mentions.members?.first();
}

export default class SuggestionChannel {
	CHANNEL_ID = "";

	/**
	 * Initialize a suggestion channel.
	 *
	 * @param {string} CHANNEL_ID - The ID of the channel to use.
	 */
	constructor(CHANNEL_ID) {
		this.CHANNEL_ID = CHANNEL_ID;
	}

	/**
	 * Post a message in a suggestion channel.
	 *
	 * @param {import("discord.js").CommandInteraction} interaction - The interaction to reply to on errors.
	 * @param {{ title: string; description: string; type: string; category: string }} data - The
	 *   suggestion information.
	 *
	 * @returns {Promise<false | import("discord.js").Message<boolean>>} - `false` on errors and the
	 *   suggestion message on success.
	 */
	async createMessage(interaction, data) {
		const author = interaction.member;

		if (!(author instanceof GuildMember))
			throw new TypeError("Did you use `/suggestion create` in a DM or something??");

		if (data.category.startsWith("Server ")) {
			await interaction.reply({
				content: `<:no:940054047854047282> In an effort to help SA developers find meaningful information, we have disabled server-related suggestions and bug reports. With this off, when a developer looks in <#${
					this.CHANNEL_ID
				}>, they can see ${
					data.category.endsWith(" bug")
						? "SA bugs they can fix without having to dig through tons of bug reports for me. If I have a bug or the server has a mistake, please send me a DM to let the mods know."
						: "SA suggestions they can add without having to dig through tons of server suggestions. If you have a suggestion to improve me or the server, please post it in <#806602307750985803> for discussion."
				}`,

				ephemeral: true,
			});

			return false;
		}

		if (data.title.length > MAX_TITLE_LENGTH) {
			await interaction.reply({
				content: `<:no:940054047854047282> The title can not be longer than ${MAX_TITLE_LENGTH} characters.`,

				ephemeral: true,
			});

			return false;
		}

		const embed = new MessageEmbed()
			.setColor("GREYPLE")
			.setAuthor({
				iconURL: author.displayAvatarURL(),

				name: `${data.type} from ${author?.displayName}` || interaction.user.username,
			})
			.setTitle(data.title)
			.setDescription(data.description)
			.setFooter({ text: `${data.category} • Unanswered` });

		const channel = await interaction.guild?.channels.fetch(this.CHANNEL_ID);

		if (!channel?.isText()) throw new ReferenceError(`${data.type} channel not found`);

		const message = await channel.send({ embeds: [embed] });
		const thread = await message.startThread({
			autoArchiveDuration: 1440,
			name: `Unanswered | ${embed.title || ""}`,
			reason: `${data.type} by ${interaction.user.tag}`,
		});

		await thread.members.add(interaction.user.id);

		return message;
	}

	/**
	 * Answer a suggestion.
	 *
	 * @param {import("discord.js").CommandInteraction} interaction - The interaction to reply to on errors.
	 * @param {string} answer - The answer to the suggestion.
	 * @param {Answers} answers - An object that maps answers to colors.
	 *
	 * @returns {Promise<boolean>} - If true, you must respond to the interaction with a success
	 *   message yourself.
	 */
	async answerSuggestion(interaction, answer, answers) {
		if (!interaction.guild) {
			await interaction.reply({
				content: "<:no:940054047854047282> Command unavailable in DMs.",
			});

			return false;
		}

		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID) {
			await interaction.reply({
				content: `<:no:940054047854047282> This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});

			return false;
		}

		const starter = await interaction.channel.fetchStarterMessage().catch(() => {});
		const roles = (await interaction.guild.members.fetch(interaction.user?.id)).roles.valueOf();

		if (!roles.has(process.env.DEVELOPER_ROLE || "")) {
			await interaction.reply({
				content: "<:no:940054047854047282> You don’t have permission to run this command!",
				ephemeral: true,
			});

			return false;
		}

		if (interaction.channel.archived) {
			await interaction.channel.setArchived(
				false,
				`Thread answered by ${interaction.user.tag}`,
			);
		}

		/** @type {Promise<any>[]} */
		const promises = [
			interaction.channel.setName(
				interaction.channel.name.replace(/^[^|]+?(?=(?: \| .+)?$)/, answer),
				`Thread answered by ${interaction.user.tag}`,
			),
		];

		if (starter && starter?.author.id === interaction.client.user?.id) {
			const embed = new MessageEmbed(starter.embeds[0]);
			const category = embed.footer?.text.split(" • ")[0];

			embed
				.setColor(answers.find(({ name }) => answer === name)?.color || "GREYPLE")
				.setFooter({ text: `${category ? `${category} • ` : ""}${answer}` });

			promises.push(starter.edit({ embeds: [embed] }));
		}

		await Promise.all(promises);

		return true;
	}

	/**
	 * Delete a suggestion.
	 *
	 * @param {import("discord.js").CommandInteraction} interaction - Interaction.
	 */
	async deleteSuggestion(interaction) {
		if (!interaction.guild) {
			await interaction.reply({
				content: "<:no:940054047854047282> This command is unavailable in DMs.",
			});

			return;
		}

		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID) {
			await interaction.reply({
				content: `<:no:940054047854047282> This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});

			return;
		}

		const starter = await interaction.channel.fetchStarterMessage();
		const user = await getUserFromThread(interaction.channel, starter);

		const roles = (await interaction.guild.members.fetch(interaction.user?.id)).roles.valueOf();

		if (
			!(
				roles.hasAny(process.env.MODERATOR_ROLE || "", process.env.DEVELOPER_ROLE || "") ||
				(user && interaction.user.id === user?.id)
			)
		) {
			await interaction.reply({
				content: "<:no:940054047854047282> You don’t have permission to run this command!",
				ephemeral: true,
			});

			return;
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
			components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
			content: "Are you really sure you want to do this?",
			ephemeral: true,
		});

		interaction.channel
			.createMessageComponentCollector({
				filter: (buttonInteraction) =>
					[deleteButton.customId, cancelButton.customId].includes(
						buttonInteraction.customId,
					) && buttonInteraction.user.id === interaction.user.id,

				time: 30_000,
			})
			.on("collect", async (buttonInteraction) => {
				switch (buttonInteraction.customId) {
					case deleteButton.customId: {
						if (
							!interaction.channel?.isThread() ||
							interaction.channel.parentId !== this.CHANNEL_ID
						) {
							await buttonInteraction.reply({
								content: `<:no:940054047854047282> This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
								ephemeral: true,
							});

							return;
						}

						await Promise.all([interaction.channel.delete(), starter.delete()]);

						break;
					}
					case cancelButton.customId: {
						deleteButton.setDisabled(true);
						cancelButton.setDisabled(true);
						await Promise.all([
							buttonInteraction.deferUpdate(),
							interaction.editReply({
								components: [
									new MessageActionRow().addComponents(
										deleteButton,
										cancelButton,
									),
								],

								content: "<:no:940054047854047282> Deletion canceled.",
							}),
						]);

						break;
					}
				}
			})
			.on("end", async (collected) => {
				if (collected.size > 0) return;

				deleteButton.setDisabled(true);
				cancelButton.setDisabled(true);
				await interaction.editReply({
					components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
					content: "<:no:940054047854047282> Deletion timed out.",
				});
			});
	}

	/**
	 * Edit a suggestion.
	 *
	 * @param {import("discord.js").CommandInteraction} interaction - Interaction to respond to on errors.
	 * @param {{ title: null | string; body: null | string; category: null | string }} updated -
	 *   Updated suggestion.
	 *
	 * @returns {Promise<boolean>} - If true, you must respond to the interaction with a success
	 *   message yourself.
	 */
	async editSuggestion(interaction, updated) {
		if (!interaction.guild) {
			await interaction.reply({
				content: "<:no:940054047854047282> The command is unavailable in DMs.",
			});

			return false;
		}

		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID) {
			await interaction.reply({
				content: `<:no:940054047854047282> This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});

			return false;
		}

		if (interaction.channel.archived)
			await interaction.channel.setArchived(false, "Thread edited");

		const starterMessage = await interaction.channel.fetchStarterMessage().catch(() => {});

		if (!starterMessage || starterMessage.author.id !== interaction.client.user?.id) {
			await interaction.reply({
				content: "<:no:940054047854047282> This suggestion can not be edited.",
				ephemeral: true,
			});

			return false;
		}

		const embed = new MessageEmbed(starterMessage.embeds[0]);
		const user = await getUserFromThread(interaction.channel, starterMessage);

		if (interaction.user.id !== user?.id) {
			await interaction.reply({
				content: "<:no:940054047854047282> You do not have permission to use this command.",
				ephemeral: true,
			});

			return false;
		}

		if (updated.body) embed?.setDescription(updated.body);

		const promises = [];

		if (updated.title) {
			promises.push(
				interaction.channel.setName(
					interaction.channel.name.replace(/(?<=^.+ \| ).+$/, updated.title),
					"Suggestion/report edited",
				),
			);

			embed?.setTitle(updated.title);
		}

		if (updated.category) {
			const answer = embed.footer?.text.split(" • ").at(-1);

			embed.setFooter({ text: `${updated.category} • ${answer || ""}` });
		}

		promises.push(starterMessage.edit({ embeds: [embed] }));

		await Promise.all(promises);

		return true;
	}
}

/**
 * Get the member who made a suggestion.
 *
 * @param {Message} message - The message to get the member from.
 *
 * @returns {Promise<import("discord.js").GuildMember | undefined>} - The member who made the suggestion.
 */
export async function getUserFromMessage(message) {
	const author =
		(message.author.id === CONSTANTS.robotop
			? message.embeds[0]?.footer?.text.split(": ")[1]
			: /\/(?<userId>\d+)\//.exec(message.embeds[0]?.author?.iconURL || "")?.groups
					?.userId) || message.author.id;

	if (author) return await message.guild?.members.fetch(author);

	return message.thread ? await getUserFromThread(message.thread) : undefined;
}
