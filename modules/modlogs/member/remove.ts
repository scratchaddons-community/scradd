import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../modlogs/logging.js";
import type Event from "../../../common/types/event";


const event: Event<"guildMemberAdd"> = async function event(member) {
	if (member.guild.id !== CONSTANTS.guild.id) return;
	await log(`💨 Member ${member.toString()} left!`, "members");
};
export default event;
