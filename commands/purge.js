import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

const MAX_FETCH_COUNT = 100;

/** @type {import("../common/types/command").ChatInputCommand} */
export default {
	data: new SlashCommandBuilder()
		.setDescription("(Mod only) Bulk deletes a specified amount of messages")
		.addStringOption((input) =>
			input
				.setName("count")
				.setDescription(
					`The number of messages to delete or a message ID to delete to (inclusive)`,
				)
				.setRequired(true)
				.setMaxLength(22),
		)
		.addUserOption((input) =>
			input.setName("user").setDescription("Only delete messages from this user"),
		)
		.setDefaultMemberPermissions(new PermissionsBitField().toJSON()),

	async interaction(interaction) {
		if (!interaction.channel) throw new TypeError("Cannot run this command in a DM");

		const count = interaction.options.getString("count", true);
		const user = interaction.options.getUser("user") || undefined;
		const numberCount = +count;
		const messages = await interaction.channel.messages.fetch({ limit: MAX_FETCH_COUNT });

		if (isNaN(numberCount) || numberCount > MAX_FETCH_COUNT) {
			const deleteTo = Object.keys(Object.fromEntries([...messages])).indexOf(count) + 1;
			if (!deleteTo) {
				await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} Could not find a message with that ID! Note: I cannot delete messages older than 2 weeks or more than 100 messages at a time.`,
				});
			} else
				await interaction.reply({
					ephemeral: true,
					content: await deleteMessages(messages, interaction.channel, deleteTo, user),
				});
		} else
			await interaction.reply({
				ephemeral: true,
				content: await deleteMessages(messages, interaction.channel, numberCount, user),
			});
	},
};

/**
 * @param {import("discord.js").Collection<import("discord.js").Snowflake, import("discord.js").Message<true>>} unfiltered
 * @param {import("discord.js").GuildTextBasedChannel} channel
 * @param {number} count
 * @param {import("discord.js").User} [user]
 */
async function deleteMessages(unfiltered, channel, count, user) {
	const twoWeeksAgo = Date.now() - 1_209_600_000;
	const filtered = unfiltered
		.toJSON()
		.filter(
			(message, index) =>
				index < count &&
				(user ? message.author.id === user.id : true) &&
				+message.createdAt > twoWeeksAgo &&
				message.deletable,
		);
	if (filtered.length) {
		await channel.bulkDelete(filtered);
		return `${CONSTANTS.emojis.statuses.yes} Deleted ${filtered.length} messages!`;
	}
	return `${CONSTANTS.emojis.statuses.no} No messages matched those filters! Note: I cannot delete messages older than 2 weeks or more than 100 messages at a time.`;
}
