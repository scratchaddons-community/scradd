import { SlashCommandBuilder } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

const MAX_FETCH_COUNT = 100;

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Bulk deletes a specified amount of messages")
		.addStringOption((input) =>
			input
				.setName("count")
				.setDescription(
					`The number of messages to delete, or a message ID within the last ${MAX_FETCH_COUNT} messages to delete up to`,
				)
				.setRequired(true)
				.setMaxLength(22),
		)
		.addUserOption((input) =>
			input.setName("user").setDescription("Only delete messages from this user"),
		)
		.setDefaultPermission(false),

	async interaction(interaction) {
		if (!interaction.channel || interaction.channel?.type === "DM")
			throw new TypeError("Can not run this command in a DM");

		const count = interaction.options.getString("count", true);
		const user = interaction.options.getUser("user");
		const numberCount = +count;
		const messages = await interaction.channel.messages.fetch({ limit: MAX_FETCH_COUNT });

		if (isNaN(numberCount) || numberCount > MAX_FETCH_COUNT) {
			const deleteTo = Object.keys(Object.fromEntries([...messages])).indexOf(count) + 1;
			if (!deleteTo) {
				return await interaction.reply(
					`${CONSTANTS.emojis.statuses.no} Could not find a message with that ID!`,
				);
			}
			return await interaction.reply(
				await deleteMessages(messages, interaction.channel, deleteTo, user),
			);
		}
		return await interaction.reply(
			await deleteMessages(messages, interaction.channel, numberCount, user),
		);
	},
};

export default info;

/**
 * @param {import("discord.js").Collection<string, import("discord.js").Message<boolean>>} unfiltered
 * @param {import("discord.js").GuildTextBasedChannel} channel
 * @param {number} count
 * @param {null | import("discord.js").User} user
 */
async function deleteMessages(unfiltered, channel, count, user) {
	const twoWeeksAgo = Date.now() - 1_209_600_000;
	const filtered = unfiltered
		.toJSON()
		.filter(
			(message, index) =>
				index < count &&
				(user ? message.author.id === user.id : true) &&
				+message.createdAt > twoWeeksAgo,
		);
	if (filtered.length) {
		await channel.bulkDelete(filtered);
		return `${CONSTANTS.emojis.statuses.yes} Deleted ${filtered.length} messages!`;
	}
	return `${CONSTANTS.emojis.statuses.no} No messages matched those filters!`;
}
