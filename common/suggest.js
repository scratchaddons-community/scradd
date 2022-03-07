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
 * 	color: import("discord.js").ColorResolvable;
 * 	name: string;
 * }} Answer
 */
/**
 * @typedef {{
 * 	description: string;
 * 	customResponse?: string;
 * 	name: string;
 * }} Category
 */

export const MAX_TITLE_LENGTH = 50;

export const RATELIMT_MESSAGE =
	"If the thread title does not update immediately, you may have been ratelimited. I will automatically change the title once the ratelimit is up (within the next hour).";

/** @type {Answer} */
export const DEFAULT_ANSWER = {
	name: "Unanswered",
	color: "GREYPLE",
	description: "This has not yet been answered",
};

export const NO_SERVER_START =
	"In an effort to help SA developers find meaningful information, we have disabled server-related suggestions and bug reports. With this off, when a developer looks in ";

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
	/**
	 * Initialize a suggestion channel.
	 *
	 * @param {string} CHANNEL_ID - The ID of the channel to use.
	 * @param {Category[]} CATEGORIES - The categories to use.
	 */
	constructor(CHANNEL_ID, CATEGORIES) {
		/** @type {string} */
		this.CHANNEL_ID = CHANNEL_ID;
		/** @type {Category[]} */
		this.CATEGORIES = CATEGORIES;
	}

	/**
	 * Post a message in a suggestion channel.
	 *
	 * @param {import("discord.js").CommandInteraction} interaction - The interaction to reply to on errors.
	 * @param {{ title: string; description: string; category: string }} data - The suggestion information.
	 *
	 * @returns {Promise<false | import("discord.js").Message<boolean>>} - `false` on errors and the
	 *   suggestion message on success.
	 */
	async createMessage(interaction, data) {
		const author = interaction.member;

		if (!(author instanceof GuildMember))
			throw new TypeError("interaction.member must be a GuildMember");

		const category = this.CATEGORIES.find((current) => current.name === data.category);

		if (category?.customResponse) {
			await interaction.reply({
				content: CONSTANTS.emojis.statuses.no + " " + category.customResponse,

				ephemeral: true,
			});

			return false;
		}

		if (data.title.length > MAX_TITLE_LENGTH) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} The title can not be longer than ${MAX_TITLE_LENGTH} characters.`,

				ephemeral: true,
			});

			return false;
		}

		const embed = new MessageEmbed()
			.setColor(DEFAULT_ANSWER.color)
			.setAuthor({
				iconURL: author.displayAvatarURL(),
				name: author?.displayName || interaction.user.username,
			})
			.setTitle(data.title)
			.setDescription(data.description)
			.setFooter({
				text: `${data.category}${CONSTANTS.footerSeperator}${DEFAULT_ANSWER.name}`,
			});

		const channel = await interaction.guild?.channels.fetch(this.CHANNEL_ID);

		if (!channel?.isText()) throw new ReferenceError(`Channel not found`);

		const message = await channel.send({ embeds: [embed] });
		const thread = await message.startThread({
			autoArchiveDuration: 1_440,
			name: `${DEFAULT_ANSWER.name} | ${embed.title || ""}`,
			reason: `Suggestion or bug report by ${interaction.user.tag}`,
		});

		await thread.members.add(interaction.user.id);

		return message;
	}

	/**
	 * Answer a suggestion.
	 *
	 * @param {import("discord.js").CommandInteraction} interaction - The interaction to reply to on errors.
	 * @param {string} answer - The answer to the suggestion.
	 * @param {Answer[]} answers - An object that maps answers to colors.
	 *
	 * @returns {Promise<boolean | "ratelimit">} - If true, you must respond to the interaction with
	 *   a success message yourself.
	 */
	async answerSuggestion(interaction, answer, answers) {
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});

			return false;
		}

		const starter = await interaction.channel.fetchStarterMessage().catch(() => {});
		const roles = (
			await interaction.guild?.members.fetch(interaction.user?.id)
		)?.roles.valueOf();

		if (!roles?.has(process.env.DEVELOPER_ROLE || "")) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} You don’t have permission to run this command!`,
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

		const promises = [
			Promise.race([
				new Promise((resolve) => setTimeout(resolve, 2_000)),
				interaction.channel.setName(
					interaction.channel.name.replace(/^[^|]+?(?=(?: \| .+)?$)/, answer),
					`Thread answered by ${interaction.user.tag}`,
				),
			]),
		];

		if (starter && starter?.author.id === interaction.client.user?.id) {
			const embed = new MessageEmbed(starter.embeds[0]);
			const category = embed.footer?.text.split(CONSTANTS.footerSeperator)[0];

			embed
				.setColor((answers.find(({ name }) => answer === name) || DEFAULT_ANSWER).color)
				.setFooter({
					text: `${category ? `${category}` + CONSTANTS.footerSeperator : ""}${answer}`,
				});

			promises.push(starter.edit({ embeds: [embed] }));
		}

		await Promise.all(promises);

		return interaction.channel.name.startsWith(answer + " |") ? true : "ratelimit";
	}

	/**
	 * Delete a suggestion.
	 *
	 * @param {import("discord.js").CommandInteraction} interaction - Interaction.
	 */
	async deleteSuggestion(interaction) {
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});

			return;
		}

		const starter = await interaction.channel.fetchStarterMessage();
		const user = await getUserFromThread(interaction.channel, starter);

		const roles = (
			await interaction.guild?.members.fetch(interaction.user?.id)
		)?.roles.valueOf();

		if (
			!(
				roles?.hasAny(process.env.MODERATOR_ROLE || "", process.env.DEVELOPER_ROLE || "") ||
				(user && interaction.user.id === user?.id)
			)
		) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} You don’t have permission to run this command!`,
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
			content: "Are you sure you want to do this?",
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
								content: `${CONSTANTS.emojis.statuses.no} This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
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

								content: `${CONSTANTS.emojis.statuses.no} Deletion canceled.`,
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
					content: `${CONSTANTS.emojis.statuses.no} Deletion timed out.`,
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
	 * @returns {Promise<boolean | "ratelimit">} - If true, you must respond to the interaction with
	 *   a success message yourself.
	 */
	async editSuggestion(interaction, updated) {
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});

			return false;
		}
		if (interaction.channel.archived)
			await interaction.channel.setArchived(false, "Thread edited");
		const starterMessage = await interaction.channel.fetchStarterMessage().catch(() => {});

		if (!starterMessage || starterMessage.author.id !== interaction.client.user?.id) {
			await interaction.reply({
				// TODO: it doesn't have to be a suggestion here
				content: `${CONSTANTS.emojis.statuses.no} This suggestion can not be edited.`,
				ephemeral: true,
			});

			return false;
		}
		const user = await getUserFromThread(interaction.channel, starterMessage);

		if (interaction.user.id !== user?.id) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} You do not have permission to use this command.`,
				ephemeral: true,
			});

			return false;
		}

		const embed = new MessageEmbed(starterMessage.embeds[0]);

		if (updated.body) embed.setDescription(updated.body);

		const promises = [];

		promises.push(
			updated.title
				? Promise.race([
						interaction.channel.setName(
							interaction.channel.name.replace(/(?<=^.+ \| ).+$/, updated.title),
							"Suggestion/report edited",
						),
						new Promise((resolve) => setTimeout(resolve, 2_000)),
				  ])
				: Promise.resolve(interaction.channel),
		);

		embed.setTitle(updated.title || embed.title || "");

		if (updated.category) {
			const answer = embed.footer?.text.split(CONSTANTS.footerSeperator).at(-1);

			embed.setFooter({
				text: `${updated.category}${CONSTANTS.footerSeperator}${answer || ""}`,
			});
		}

		promises.push(starterMessage.edit({ embeds: [embed] }));

		await Promise.all(promises);

		return (updated.title ? interaction.channel.name.endsWith(updated.title) : true)
			? true
			: "ratelimit";
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

	if (author) return await message.guild?.members.fetch(author).catch(() => undefined);

	return message.thread ? await getUserFromThread(message.thread) : undefined;
}
