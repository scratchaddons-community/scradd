import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"roleDelete">} */
const event = {
	async event(role) {
		if (role.guild.id !== process.env.GUILD_ID) return;
		await log(role.guild, `Role @${role.name} deleted! (ID ${role.id})`, "server");
	},
};

export default event;
