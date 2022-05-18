import { automodMessage } from "../../common/moderation/automod.js";
import log from "../../common/moderation/logging.js";
import { extractMessageExtremities } from "../../lib/message.js";
import jsonDiff from "json-diff";
import { MessageAttachment } from "discord.js";
import diffLib from "difflib";

/**
 * @file Enables Error reporting.
 *
 * @type {import("../../types/event").default<"messageUpdate">}
 */
const event = {
	async event(oldMessage, newMessage) {
		if (newMessage.partial) newMessage = await newMessage.fetch();
		if (!newMessage.guild || newMessage.guild.id !== process.env.GUILD_ID) return;
		const logs = [];
		if (oldMessage.flags.has("CROSSPOSTED") !== newMessage.flags.has("CROSSPOSTED")) {
			logs.push(`Message ${newMessage.flags.has("CROSSPOSTED") ? "" : "un"}published`);
		}
		if (oldMessage.flags.has("SUPPRESS_EMBEDS") !== newMessage.flags.has("SUPPRESS_EMBEDS")) {
			logs.push(
				`Embeds ${newMessage.flags.has("SUPPRESS_EMBEDS") ? "hidden" : "shown"} on message`,
			);
		}
		if (oldMessage.pinned !== null && oldMessage.pinned !== newMessage.pinned) {
			logs.push(`Message ${newMessage.pinned ? "" : "un"}pinned`);
		}
		if (!newMessage.author.bot) {
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
					new MessageAttachment(
						Buffer.from(
							contentDiff.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
							"utf-8",
						),
						"content.diff",
					),
				);

			if (extraDiff)
				files.push(new MessageAttachment(Buffer.from(extraDiff, "utf-8"), "extra.diff"));

			if (files.length > 0)
				log(
					newMessage.guild,
					`Message edited in ${newMessage.channel.toString()}!`,
					"messages",
					{ files },
				);
		}

		await Promise.all(
			logs.map(
				(edit) =>
					newMessage.guild &&
					log(
						newMessage.guild,
						edit + ` in ${newMessage.channel.toString()}!`,
						"messages",
					),
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

// todo add button to view the msg
