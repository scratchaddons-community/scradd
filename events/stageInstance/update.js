import client from "../../client.js";
import log from "../../common/moderation/logging.js";
import difflib from "difflib";
import { AttachmentBuilder } from "discord.js";

/** @type {import("../../common/types/event").default<"stageInstanceUpdate">} */
export default async function event(oldInstance, newInstance) {
	const guild = newInstance.guild || (await client.guilds.fetch(newInstance.guildId));
	if (!oldInstance || guild.id !== process.env.GUILD_ID) return;

	if (oldInstance.topic !== newInstance.topic) {
		log(`✏ Stage ${newInstance.channel?.toString()}’s topic was changed!`, "voice", {
			files: [
				new AttachmentBuilder(
					Buffer.from(
						difflib
							.unifiedDiff(
								newInstance.topic.split("\n"),
								oldInstance.topic.split("\n"),
							)
							.join("\n")
							.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
						"utf-8",
					),
					{ name: "topic.diff" },
				),
			],
		});
	}
}
