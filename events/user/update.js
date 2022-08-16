import { changeNickname } from "../../common/moderation/automod.js";
import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"userUpdate">} */
const event = {
	async event(oldUser, newUser) {
		newUser = await newUser.fetch();
		const guild = await this.guilds.fetch(process.env.GUILD_ID || "");

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
			logs.map((edit) =>
				log(guild, `🫂 User ${newUser.toString()} ` + edit + `!`, "members"),
			),
		);

		const member = await guild.members.fetch(newUser.id).catch(() => {});
		if (!member) return;
		await changeNickname(member);
	},
};

export default event;
