import log from "../common/moderation/logging.js";

/** @type {import("../common/types/event").default<"applicationCommandPermissionsUpdate">} */
export default async function event(permissions) {
	if (permissions.guildId !== process.env.GUILD_ID) return;

	await log(`✏ Permissions for <@${permissions.applicationId}>'s commands edited!`, "server");
}
