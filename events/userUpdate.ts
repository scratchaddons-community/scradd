import { changeNickname } from "../common/automod.js";
import CONSTANTS from "../common/CONSTANTS.js";
import log from "../common/logging.js";

import type Event from "../common/types/event";

const event: Event<"userUpdate"> = async function event(oldUser, partialUser) {
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

	const member = await CONSTANTS.guild.members.fetch(newUser.id).catch(() => {});
	if (!member) return;
	await changeNickname(member);
};
export default event;
