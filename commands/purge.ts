import {
	ApplicationCommandOptionType,
	type Collection,
	type GuildTextBasedChannel,
	type Message,
	type Snowflake,
	type User,
} from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import { defineCommand } from "../common/types/command.js";

const MAX_FETCH_COUNT = 100;

const command = defineCommand({
	data: {
		description: "(Mod only) Bulk deletes a specified amount of messages",

		options: {
			count: {
				type: ApplicationCommandOptionType.String,
				description:
					"The number of messages to delete or a message ID to delete to (inclusive)",
				required: true,
			},

			user: {
				type: ApplicationCommandOptionType.User,
				description: "Only delete messages from this user",
			},
		},

		restricted: true,
	},

	async interaction(interaction) {
		if (!interaction.channel) throw new TypeError("Cannot run this command in a DM");

		const count = interaction.options.getString("count", true);
		const user = interaction.options.getUser("user") || undefined;
		const numberCount = Number(count);
		const messages = await interaction.channel.messages.fetch({ limit: MAX_FETCH_COUNT });

		if (isNaN(numberCount) || numberCount > MAX_FETCH_COUNT) {
			const deleteTo = Object.keys(Object.fromEntries(messages)).indexOf(count) + 1;
			await (deleteTo
				? interaction.reply(
						await deleteMessages(messages, interaction.channel, deleteTo, user),
				  )
				: interaction.reply({
						content: `${CONSTANTS.emojis.statuses.no} Could not find a message with that ID! Note: I cannot delete messages older than 2 weeks or more than ${MAX_FETCH_COUNT} messages at a time.`,
						ephemeral: true,
				  }));
		} else {
			await interaction.reply(
				await deleteMessages(messages, interaction.channel, numberCount, user),
			);
		}
	},
});
export default command;

/**
 * @param unfiltered
 * @param channel
 * @param count
 * @param user
 */
async function deleteMessages(
	unfiltered: Collection<Snowflake, Message<true>>,
	channel: GuildTextBasedChannel,
	count: number,
	user?: User,
) {
	const filtered = unfiltered
		.toJSON()
		.filter(
			(message, index) =>
				index < count &&
				(user ? message.author.id === user.id : true) &&
				message.bulkDeletable,
		);
	if (filtered.length > 0) {
		// TODO: channel.createMessageComponentCollector({})
		// return {}
		await channel.bulkDelete(filtered);
		return {
			content: `${CONSTANTS.emojis.statuses.yes} Deleted ${filtered.length} messages!`,
			ephemeral: true,
		};
	}
	return {
		content: `${CONSTANTS.emojis.statuses.no} No messages matched those filters! Note: I cannot delete messages older than 2 weeks or more than ${MAX_FETCH_COUNT} messages at a time.`,
		ephemeral: true,
	};
}
