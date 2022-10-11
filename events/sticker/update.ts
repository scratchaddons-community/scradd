import { AttachmentBuilder } from "discord.js";
import difflib from "difflib";
import log from "../../common/moderation/logging.js";
import type Event from "../../common/types/event";

const event: Event<"stickerUpdate"> = async function event(oldSticker, newSticker) {
	if (newSticker.partial) newSticker = await newSticker.fetch();
	if (!newSticker.guild || newSticker.guild.id !== process.env.GUILD_ID) return;

	const logs = [];
	if (oldSticker.description !== newSticker.description) {
		log(`✏ Sticker ${oldSticker.name}’s description was changed!`, "server", {
			files: [
				new AttachmentBuilder(
					Buffer.from(
						difflib
							.unifiedDiff(
								(oldSticker.description || "").split("\n"),
								(newSticker.description || "").split("\n"),
							)
							.join("\n")
							.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
						"utf-8",
					),
					{ name: "description.diff" },
				),
			],
		});
	}
	if (oldSticker.name !== newSticker.name) {
		logs.push(` renamed to ${newSticker.name}`);
	}
	if (oldSticker.tags !== newSticker.tags) {
		logs.push(
			`’s related emoji ` + (newSticker.tags ? `set to ${newSticker.tags}` : "removed"),
		);
	}

	await Promise.all(
		logs.map((edit) => log(`✏ Sticker ${oldSticker.name}` + edit + `!`, "server")),
	);
};
export default event;
