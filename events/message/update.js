import { automodMessage } from "../../common/moderation/automod.js";
import log from "../../common/moderation/logging.js";
import { extractMessageExtremities } from "../../lib/message.js";
import jsonDiff from "json-diff";
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, MessageEmbed } from "discord.js";
import diffLib from "difflib";

/** @type {import("../../types/event").default<"messageUpdate">} */
const event = {
	async event(oldMessage, newMessage) {
		if (newMessage.partial) newMessage = await newMessage.fetch();
		if (!newMessage.guild || newMessage.guild.id !== process.env.GUILD_ID) return;
		const logs = [];
		if (oldMessage.flags.has("CROSSPOSTED") !== newMessage.flags.has("CROSSPOSTED")) {
			logs.push(
				`Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${
					newMessage.flags.has("CROSSPOSTED") ? "" : "un"
				}published`,
			);
		}
		if (oldMessage.flags.has("SUPPRESS_EMBEDS") !== newMessage.flags.has("SUPPRESS_EMBEDS")) {
			log(
				newMessage.guild,
				`Embeds ${
					newMessage.flags.has("SUPPRESS_EMBEDS") ? "hidden" : "shown"
				} on message by ${newMessage.author.toString()} in ${newMessage.channel.toString()}` +
					"!",
				"messages",
				{ embeds: newMessage.embeds.map((embed) => new MessageEmbed(embed)) },
			);
		}
		if (oldMessage.pinned !== null && oldMessage.pinned !== newMessage.pinned) {
			logs.push(
				`Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${
					newMessage.pinned ? "" : "un"
				}pinned`,
			);
		}
		if (!oldMessage.partial && !newMessage.author.bot) {
			const files = [];
			const contentDiff =
				oldMessage.content !== null &&
				diffLib
					.unifiedDiff(
						(oldMessage.content ?? "").split("\n"),
						newMessage.content.split("\n"),
					)
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
						"content.diff",
					),
				);

			if (extraDiff)
				files.push(new AttachmentBuilder(Buffer.from(extraDiff, "utf-8"), "extra.diff"));

			if (files.length)
				log(
					newMessage.guild,
					`Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} edited!`,
					"messages",
					{ files },
				);
		}

		await Promise.all(
			logs.map(
				(edit) =>
					newMessage.guild &&
					log(newMessage.guild, edit + "!", "messages", {
						components: [
							new ActionRowBuilder().addComponents(
								new ButtonBuilder()
									.setEmoji("👀")
									.setLabel("View Message")
									.setStyle("LINK")
									.setURL(newMessage.url),
							),
						],
					}),
			),
		);
		if (await automodMessage(newMessage)) return;
	},
};

export default event;

/** @param {import("discord.js").Message | import("discord.js").PartialMessage} message */
async function getMessageJSON(message) {
	const { embeds, files } = await extractMessageExtremities(message);

	return {
		components: message.components.map((component) => component.toJSON()),
		embeds: embeds.map((embed) => embed.toJSON()),
		files: files.map((file) => file.toJSON()),
	};
}
