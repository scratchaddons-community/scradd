import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"roleCreate">} */
const event = {
	async event(role) {
		if (role.guild.id !== process.env.GUILD_ID) return;
		await log(role.guild, `🏷 Role ${role.toString()} created!`, "server");
	},
};

export default event;
