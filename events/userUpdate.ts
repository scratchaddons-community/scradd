import { changeNickname } from "../common/automod.js";
import CONSTANTS from "../common/CONSTANTS.js";
import log from "../common/logging.js";

import type Event from "../common/types/event";

const event: Event<"userUpdate"> = async function event(oldUser, newUser) {
	newUser = await newUser.fetch();

	if (oldUser.tag !== newUser.tag) {
		log(
			`👤 User ${newUser.toString()} changed their username from ${oldUser.tag} to ${
				newUser.tag
			}!`,
			"members",
		);
	}
	if (oldUser.displayAvatarURL() !== newUser.displayAvatarURL()) {
		const response = await fetch(newUser.displayAvatarURL({ size: 128, forceStatic: false }));
		await log(`👤 User ${newUser.toString()} changed their avatar!`, "members", {
			files: [Buffer.from(await response.arrayBuffer())],
		});
	}

	const member = await CONSTANTS.guild.members.fetch(newUser.id).catch(() => {});
	if (!member) return;
	await changeNickname(member);
};
export default event;
