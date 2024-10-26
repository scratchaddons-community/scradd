import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { client, defineButton, defineChatCommand, defineEvent, defineMenuCommand } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import makeSlideshow, { NO_BOARDS_MESSAGE, defaultMinReactions } from "./explore.js";
import { BOARD_EMOJI, REACTIONS_NAME } from "./misc.js";
import updateBoard from "./update.js";

const reactionsName = REACTIONS_NAME.toLowerCase();

defineEvent("messageReactionAdd", async ({ message: partialMessage }, partialUser) => {
	const message = partialMessage.partial ? await partialMessage.fetch() : partialMessage;
	if (
		message.author.id === client.user.id &&
		(message.channel.id === config.channels.board?.id || message.webhookId) &&
		(message.content.startsWith(`**${BOARD_EMOJI}`) ||
			message.content.endsWith(NO_BOARDS_MESSAGE))
	)
		return;

	const reaction = message.reactions.resolve(BOARD_EMOJI);
	if (!reaction) return;

	const user = partialUser.partial ? await partialUser.fetch() : partialUser;
	if (user.id === message.author.id && constants.env === "production")
		return await reaction.users.remove(user);

	await updateBoard({ count: reaction.count, message });
});
defineEvent("messageReactionRemove", async ({ message: partialMessage }) => {
	const message = partialMessage.partial ? await partialMessage.fetch() : partialMessage;
	await updateBoard({ count: message.reactions.resolve(BOARD_EMOJI)?.count ?? 0, message });
});

defineChatCommand(
	{
		name: `explore-${reactionsName}`,
		description: `Find random messages with ${BOARD_EMOJI} reactions`,
		access: true,

		options: {
			"channel": {
				description: "Only get messages from this channel",
				type: ApplicationCommandOptionType.Channel,
			},

			"minimum-reactions": {
				description: `Only get messages with at least this many reactions (defaults to ${defaultMinReactions})`,
				minValue: 1,
				type: ApplicationCommandOptionType.Integer,
			},

			"user": {
				description: "Only get messages sent by this user",
				type: ApplicationCommandOptionType.User,
			},
		},
	},

	async (interaction, options) => {
		await makeSlideshow(interaction, {
			channel: options.channel,
			user: options.user?.id,
			minReactions: options["minimum-reactions"],
		});
	},
);
defineMenuCommand(
	{ name: `Explore ${REACTIONS_NAME}`, type: ApplicationCommandType.User, access: true },
	async (interaction) => {
		await makeSlideshow(interaction, { user: interaction.targetUser.id });
	},
);
defineButton("exploreBoard", async (interaction, userId) => {
	await makeSlideshow(interaction, { user: userId });
});

defineMenuCommand(
	{ name: `Sync ${REACTIONS_NAME}`, type: ApplicationCommandType.Message, access: false },
	async (interaction) => {
		await interaction.deferReply({ ephemeral: true });
		const count = interaction.targetMessage.reactions.resolve(BOARD_EMOJI)?.count ?? 0;
		await updateBoard({ count, message: interaction.targetMessage });
		await interaction.editReply(
			`${constants.emojis.statuses.yes} Synced ${reactionsName}! [That message](<${
				interaction.targetMessage.url
			}>) by ${interaction.targetMessage.author.toString()} has ${count || "no"} ${BOARD_EMOJI} reaction${count === 1 ? "" : "s"}.`,
		);
	},
);
