import difflib from "difflib";

import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";

import type Event from "../../common/types/event";

const event: Event<"stickerUpdate"> = async function event(oldSticker, partialSticker) {
	const newSticker = partialSticker.partial ? await partialSticker.fetch() : partialSticker;

	if (!newSticker.guild || newSticker.guild.id !== CONSTANTS.guild.id) return;

	const logs = [];
	if (oldSticker.description !== newSticker.description) {
		await log(`✏️ Sticker ${oldSticker.name}’s description was changed!`, "server", {
			files: [
				{
					attachment: Buffer.from(
						difflib
							.unifiedDiff(
								(oldSticker.description ?? "").split("\n"),
								(newSticker.description ?? "").split("\n"),
							)
							.join("\n")
							.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
						"utf8",
					),

					name: "description.diff",
				},
			],
		});
	}
	if (oldSticker.name !== newSticker.name) logs.push(` renamed to ${newSticker.name}`);

	if (oldSticker.tags !== newSticker.tags)
		logs.push(`’s related emoji ${newSticker.tags ? `set to ${newSticker.tags}` : "removed"}`);

	await Promise.all(
		logs.map(async (edit) => await log(`✏️ Sticker ${oldSticker.name}${edit}!`, "server")),
	);
};
export default event;
