import client from "../../../client.js";
import log from "../../../common/moderation/logging.js";
import difflib from "difflib";
import { AttachmentBuilder } from "discord.js";

/** @type {import("../../../types/event").default<"stageInstanceUpdate">} */
export default async function event(oldInstance, newInstance) {
	const guild = newInstance.guild || (await client.guilds.fetch(newInstance.guildId));
	if (!oldInstance || guild.id !== process.env.GUILD_ID) return;

	const logs = [];

	if (oldInstance.topic !== newInstance.topic) {
		log(`✏ Stage ${newInstance.channel?.toString()}’s topic was changed!`, "server", {
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
		logs.push(`’s topic set to ${newInstance.topic}`);
	}

	await Promise.all(
		logs.map((edit) => log(`✏ Stage ${newInstance.channel?.toString()}` + edit + `!`, "voice")),
	);
}
