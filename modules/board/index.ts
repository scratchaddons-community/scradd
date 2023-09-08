import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { BOARD_EMOJI, REACTIONS_NAME } from "./misc.js";
import makeSlideshow, { NO_BOARDS_MESSAGE, defaultMinReactions } from "./explore.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { client, defineChatCommand, defineEvent, defineButton, defineMenuCommand } from "strife.js";
import updateBoard from "./update.js";

const reactionsName = REACTIONS_NAME.toLowerCase();

defineEvent("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	if (reaction.emoji.name !== BOARD_EMOJI) return;

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
	if (
		message.author.id === client.user.id &&
		(message.channel.id === config.channels.board?.id || message.webhookId) &&
		(message.content.startsWith(`**${BOARD_EMOJI}`) ||
			message.content.endsWith(NO_BOARDS_MESSAGE))
	)
		return;

	const user = partialUser.partial ? await partialUser.fetch() : partialUser;
	if (user.id === message.author.id && process.env.NODE_ENV === "production")
		return await reaction.users.remove(user);

	await updateBoard(reaction);
});
defineEvent("messageReactionRemove", async (partialReaction) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	if (reaction.emoji.name === BOARD_EMOJI) await updateBoard(reaction);
});

defineChatCommand(
	{
		name: `explore-${reactionsName}`,
		description: `Replies with a random message that has ${BOARD_EMOJI} reactions`,
		access: false,

		options: {
			"channel": {
				description: "Filter messages to only get those in a certain channel",
				type: ApplicationCommandOptionType.Channel,
			},

			"minimum-reactions": {
				description: `Filter messages to only get those with at least this many reactions (defaults to ${defaultMinReactions})`,
				minValue: 1,
				type: ApplicationCommandOptionType.Integer,
			},

			"user": {
				description: "Filter messages to only get those by a certain user",
				type: ApplicationCommandOptionType.User,
			},
		},
	},

	async (interaction, options) => {
		const minReactions = options["minimum-reactions"];
		const user = options.user?.id;
		const channel = options.channel;
		await makeSlideshow(interaction, { minReactions, user, channel });
	},
);
defineButton("exploreBoard", async (interaction, userId) => {
	await makeSlideshow(interaction, { user: userId });
});

defineMenuCommand(
	{ name: `Sync ${REACTIONS_NAME}`, type: ApplicationCommandType.Message, access: false },
	async (interaction) => {
		await interaction.deferReply({ ephemeral: true });
		const reaction = interaction.targetMessage.reactions.resolve(BOARD_EMOJI) ?? {
			count: 0,
			message: interaction.targetMessage,
		};
		await updateBoard(reaction);
		await interaction.editReply(`${constants.emojis.statuses.yes} Synced ${reactionsName}!`);
	},
);
