import changeNickname from "../modules/automod/nicknames.js";
import CONSTANTS from "../common/CONSTANTS.js";

import type Event from "../common/types/event";

const event: Event<"userUpdate"> = async function event(_, partialUser) {
	const newUser = partialUser.partial ? await partialUser.fetch() : partialUser;

	const member = await CONSTANTS.guild.members.fetch(newUser.id).catch(() => {});
	if (!member) return;
	await changeNickname(member, false);
};
export default event;
