import log from "./logging.js";

import type Event from "../../common/types/event";

defineEvent("userUpdate", async (oldUser, partialUser) => {
	const newUser = partialUser.partial ? await partialUser.fetch() : partialUser;

	if (oldUser.tag !== newUser.tag) {
		await log(
			`👤 User ${newUser.toString()} changed their username from ${oldUser.tag} to ${
				newUser.tag
			}!`,
			"members",
		);
	}
	if (oldUser.displayAvatarURL() !== newUser.displayAvatarURL()) {
		const response = await fetch(newUser.displayAvatarURL({ forceStatic: false, size: 128 }));
		await log(`👤 User ${newUser.toString()} changed their avatar!`, "members", {
			files: [Buffer.from(await response.arrayBuffer())],
		});
	}
});
