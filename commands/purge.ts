import {
	ApplicationCommandOptionType,
	Collection,
	GuildTextBasedChannel,
	Message,
	PermissionsBitField,
	Snowflake,
	User,
} from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import type { ChatInputCommand } from "../common/types/command";

const MAX_FETCH_COUNT = 100;

const command: ChatInputCommand = {
	data: {
		description: "(Mod only) Bulk deletes a specified amount of messages",
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "count",
				description: `The number of messages to delete or a message ID to delete to (inclusive)`,
				required: true,
			},
			{
				type: ApplicationCommandOptionType.User,
				name: "user",
				description: "Only delete messages from this user",
			},
		],
		default_member_permissions: new PermissionsBitField().toJSON(),
	},

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
					content: `${CONSTANTS.emojis.statuses.no} Could not find a message with that ID! Note: I cannot delete messages older than 2 weeks or more than ${MAX_FETCH_COUNT} messages at a time.`,
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
export default command;

async function deleteMessages(
	unfiltered: Collection<Snowflake, Message<true>>,
	channel: GuildTextBasedChannel,
	count: number,
	user?: User,
) {
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
	return `${CONSTANTS.emojis.statuses.no} No messages matched those filters! Note: I cannot delete messages older than 2 weeks or more than ${MAX_FETCH_COUNT} messages at a time.`;
}
