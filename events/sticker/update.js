import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"stickerUpdate">} */
const event = {
	async event(oldSticker, newSticker) {
		if (newSticker.partial) newSticker = await newSticker.fetch();
		if (!newSticker.guild || newSticker.guild.id !== process.env.GUILD_ID) return;

		const logs = [];
		if (oldSticker.description !== newSticker.description) {
			logs.push(
				`'s description ${
					newSticker.description ? `set to ${newSticker.description}` : "removed"
				}`,
			);
		} //todo
		if (oldSticker.name !== newSticker.name) {
			logs.push(` renamed to ${newSticker.name}`);
		}

		await Promise.all(
			logs.map((edit) =>
			newSticker.guild&&			log(newSticker.guild, `Sticker ${oldSticker.name}` + edit + `!`, "messages"),
			),
		);
	},
};

export default event;

//todo: perms
