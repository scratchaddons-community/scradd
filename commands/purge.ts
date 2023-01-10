import {
	ApplicationCommandOptionType,
	type Collection,
	type Message,
	type Snowflake,
	type User,
} from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import { defineCommand } from "../common/types/command.js";

const MAX_FETCH_COUNT = 100;

/**
 * Filter and bulk delete messages.
 *
 * @param unfiltered - The messages to be deleted.
 * @param count - How many messages to delete (inclusive).
 * @param user - Filter to only delete messages from this user.
 */
async function deleteMessages(
	unfiltered: Collection<Snowflake, Message<true>>,
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
	if (filtered[0]) {
		// channel.createMessageComponentCollector({});
		// return {};
		await filtered[0].channel.bulkDelete(filtered);
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
		const user = interaction.options.getUser("user") ?? undefined;
		const numberCount = Number(count);
		const messages = await interaction.channel.messages.fetch({ limit: MAX_FETCH_COUNT });

		if (Number.isNaN(numberCount) || numberCount > MAX_FETCH_COUNT) {
			const deleteTo = Object.keys(Object.fromEntries(messages)).indexOf(count) + 1;
			await (deleteTo
				? interaction.reply(await deleteMessages(messages, deleteTo, user))
				: interaction.reply({
						content: `${CONSTANTS.emojis.statuses.no} Could not find a message with that ID! Note: I cannot delete messages older than 2 weeks or more than ${MAX_FETCH_COUNT} messages at a time.`,
						ephemeral: true,
				  }));
		} else {
			await interaction.reply(await deleteMessages(messages, numberCount, user));
		}
	},
});
export default command;
