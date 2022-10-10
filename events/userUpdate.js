import { guild } from "../client.js";
import { changeNickname } from "../common/moderation/automod.js";
import log from "../common/moderation/logging.js";

/** @type {import("../common/types/event").default<"userUpdate">} */
export default async function event(oldUser, newUser) {
	newUser = await newUser.fetch();

	const logs = [];
	if (oldUser.tag !== newUser.tag) {
		logs.push(`changed their username from ${oldUser.tag} to ${newUser.tag}`);
	}
	if (oldUser.displayAvatarURL() !== newUser.displayAvatarURL()) {
		logs.push(
			`changed their avatar from <${oldUser.displayAvatarURL()}> to <${newUser.displayAvatarURL()}>`,
		); // TODO: it’ll be 404
	}

	await Promise.all(
		logs.map((edit) => log(`👤 User ${newUser.toString()} ` + edit + `!`, "members")),
	);

	const member = await guild.members.fetch(newUser.id).catch(() => {});
	if (!member) return;
	await changeNickname(member);
}
