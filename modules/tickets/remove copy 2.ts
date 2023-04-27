import CONSTANTS from "../../common/CONSTANTS.js";
import { getThreadFromMember } from "./tickets.js";

import type Event from "../../common/types/event";


const event: Event<"guildMemberAdd"> = async function event(member) {
	if (member.guild.id !== CONSTANTS.guild.id) return;
	await getThreadFromMember(member).then(async (thread) => {
		await thread?.setArchived(true, "Member left");
	});
};
export default event;
