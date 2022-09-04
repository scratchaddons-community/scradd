import log from "../../common/moderation/logging.js";

/** @type {import("../../common/types/event").default<"roleDelete">} */
export default async function event(role) {
	if (role.guild.id !== process.env.GUILD_ID) return;
	await log(`🗄 Role @${role.name} deleted! (ID ${role.id})`, "server");
}
