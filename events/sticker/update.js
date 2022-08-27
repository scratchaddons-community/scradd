import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"stickerUpdate">} */
export default async function event(oldSticker, newSticker) {
	if (newSticker.partial) newSticker = await newSticker.fetch();
	if (!newSticker.guild || newSticker.guild.id !== process.env.GUILD_ID) return;

	const logs = [];
	if (oldSticker.description !== newSticker.description) {
		logs.push(
			`’s description ${
				newSticker.description ? `set to ${newSticker.description}` : "removed"
			}`,
		);
	}
	if (oldSticker.name !== newSticker.name) {
		logs.push(` renamed to ${newSticker.name}`);
	}
	if (oldSticker.tags !== newSticker.tags) {
		logs.push(`'s tags ` + (newSticker.tags ? `changed to ${newSticker.tags}` : "removed"));
	}

	await Promise.all(
		logs.map((edit) => log(`✏ Sticker ${oldSticker.name}` + edit + `!`, "messages")),
	);
}
