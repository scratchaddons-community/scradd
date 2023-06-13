import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { BOARD_EMOJI, REACTIONS_NAME } from "./misc.js";
import makeSlideshow, { defaultMinReactions } from "./explore.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { client, defineCommand, defineEvent, defineButton } from "strife.js";
import updateBoard from "./update.js";

const reactionsName = REACTIONS_NAME.toLowerCase();

defineEvent("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (!message.inGuild() || message.guild.id !== config.guild.id) return;

	const user = partialUser.partial ? await partialUser.fetch() : partialUser;

	const { emoji } = reaction;

	if (emoji.name === BOARD_EMOJI) {
		if (
			(user.id === message.author.id && process.env.NODE_ENV === "production") ||
			(message.channel.id === config.channels.board?.id &&
				message.author.id === client.user.id) ||
			[`explore-${reactionsName}`, `explore${reactionsName}`].includes(
				message.interaction?.commandName || "",
			)
		) {
			await reaction.users.remove(user);

			return;
		}

		await updateBoard(message);
	}
});
defineEvent("messageReactionRemove", async (partialReaction) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (!message.inGuild() || message.guild.id !== config.guild.id) return;

	if (reaction.emoji.name === BOARD_EMOJI) await updateBoard(message);
});

defineCommand(
	{
		name: `explore-${reactionsName}`,
		description: `Replies with a random message that has ${BOARD_EMOJI} reactions`,

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

	async (interaction) => {
		const minReactions = interaction.options.getInteger("minimum-reactions") ?? undefined;
		const user = interaction.options.getUser("user")?.id;
		const channel = interaction.options.getChannel("channel") ?? undefined;
		await makeSlideshow(interaction, { minReactions, user, channel });
	},
);
defineButton("exploreBoard", async (interaction, userId) => {
	await makeSlideshow(interaction, { user: userId });
});

defineCommand(
	{ name: `Sync ${REACTIONS_NAME}`, type: ApplicationCommandType.Message },
	async (interaction) => {
		await interaction.deferReply({ ephemeral: true });
		await updateBoard(interaction.targetMessage);
		await interaction.editReply(`${constants.emojis.statuses.yes} Synced ${reactionsName}!`);
	},
);
