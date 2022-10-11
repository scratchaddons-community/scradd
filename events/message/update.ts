import { automodMessage } from "../../common/moderation/automod.js";
import log, { getLoggingThread } from "../../common/moderation/logging.js";
import { extractMessageExtremities } from "../../util/discord.js";
import jsonDiff from "json-diff";
import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	Message,
	PartialMessage,
	PermissionFlagsBits,
} from "discord.js";
import diffLib from "difflib";
import CONSTANTS from "../../common/CONSTANTS.js";
import client from "../../client.js";

const loggingThread = await getLoggingThread("databases");
import type Event from "../../common/types/event";

const event: Event<"messageUpdate"> = async function event(oldMessage, newMessage) {
	if (newMessage.partial) newMessage = await newMessage.fetch();
	if (
		newMessage.channel.isDMBased() ||
		newMessage.guild?.id !== process.env.GUILD_ID ||
		!newMessage.channel
			.permissionsFor(CONSTANTS.roles.mod || newMessage.guild.id)
			?.has(PermissionFlagsBits.ViewChannel)
	)
		return;
	const logs = [];
	if (oldMessage.flags.has("Crossposted") !== newMessage.flags.has("Crossposted")) {
		logs.push(
			`📢 Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${
				newMessage.flags.has("Crossposted") ? "" : "un"
			}published`,
		);
	}
	if (oldMessage.flags.has("SuppressEmbeds") !== newMessage.flags.has("SuppressEmbeds")) {
		log(
			`🗄 Embeds ${
				newMessage.flags.has("SuppressEmbeds") ? "removed" : "shown"
			} on message by ${newMessage.author.toString()} in ${newMessage.channel.toString()}` +
				"!",
			"messages",
			{
				embeds: oldMessage.embeds.map((embed) => EmbedBuilder.from(embed)),
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setLabel("View Message")
							.setStyle(ButtonStyle.Link)
							.setURL(newMessage.url),
					),
				],
			},
		);
	}
	if (
		oldMessage.pinned !== null &&
		(newMessage.author.id === client.user.id) !==
			(newMessage.channel.id === CONSTANTS.channels.board?.id) &&
		oldMessage.pinned !== newMessage.pinned
	) {
		logs.push(
			`📌 Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${
				newMessage.pinned ? "" : "un"
			}pinned`,
		);
	}
	if (
		!oldMessage.partial &&
		!newMessage.interaction &&
		loggingThread.id !== newMessage.channel.id &&
		newMessage.author.id !== CONSTANTS.robotop
	) {
		const files = [];
		const contentDiff =
			oldMessage.content !== null &&
			diffLib
				.unifiedDiff((oldMessage.content ?? "").split("\n"), newMessage.content.split("\n"))
				.join("\n");

		const extraDiff = jsonDiff.diffString(
			await getMessageJSON(oldMessage),
			await getMessageJSON(newMessage),
			{ color: false },
		);

		if (contentDiff)
			files.push(
				new AttachmentBuilder(
					Buffer.from(
						contentDiff.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
						"utf-8",
					),
					{ name: "content.diff" },
				),
			);

		if (extraDiff)
			files.push(
				new AttachmentBuilder(Buffer.from(extraDiff, "utf-8"), { name: "extra.diff" }),
			);

		if (files.length)
			log(
				`✏ Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} edited!`,
				"messages",
				{
					files,
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setLabel("View Message")
								.setStyle(ButtonStyle.Link)
								.setURL(newMessage.url),
						),
					],
				},
			);
	}

	await Promise.all(
		logs.map((edit) =>
			log(edit + "!", "messages", {
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setLabel("View Message")
							.setStyle(ButtonStyle.Link)
							.setURL(newMessage.url),
					),
				],
			}),
		),
	);
	if (await automodMessage(newMessage)) return;
};

async function getMessageJSON(message: Message | PartialMessage) {
	const { embeds, files } = await extractMessageExtremities(message);

	return {
		components: message.components.map((component) => component.toJSON()),
		embeds: message.author?.bot ?? true ? embeds : [],
		files: files,
	};
}
export default event;
