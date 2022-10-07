import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	PermissionFlagsBits,
} from "discord.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../../common/moderation/logging.js";
import type Event from "../../../common/types/event";

const event: Event<"messageReactionRemoveAll"> = async function event(message, reactions) {
	if (
		message.channel.isDMBased() ||
		message.guild?.id !== process.env.GUILD_ID ||
		!message.channel
			.permissionsFor(CONSTANTS.roles.mod || message.guild.id)
			?.has(PermissionFlagsBits.ViewChannel)
	)
		return;

	await log(
		`😳 Reactions purged on message by ${message.author?.toString()} in ${message.channel.toString()}!`,
		"messages",
		{
			embeds: [
				new EmbedBuilder().addFields(
					reactions.map((reaction) => ({
						name: reaction.emoji.toString(),
						value: reaction.count + ` reaction${reaction.count === 1 ? "" : "s"}`,
						inline: true,
					})),
				),
			],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setLabel("View Context")
						.setStyle(ButtonStyle.Link)
						.setURL(message.url),
				),
			],
		},
	);
};

export default event;
