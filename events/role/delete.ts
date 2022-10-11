import log from "../../common/moderation/logging.js";
import type Event from "../../common/types/event";

const event: Event<"roleDelete"> = async function event(role) {
	if (role.guild.id !== process.env.GUILD_ID) return;
	await log(`🗄 Role @${role.name} deleted! (ID: ${role.id})`, "server");
};
export default event;
