import changeNickname from "../modules/automod/nicknames.js";
import CONSTANTS from "../common/CONSTANTS.js";

defineEvent("userUpdate", async (_, partialUser) => {
	const newUser = partialUser.partial ? await partialUser.fetch() : partialUser;

	const member = await CONSTANTS.guild.members.fetch(newUser.id).catch(() => {});
	if (!member) return;
	await changeNickname(member, false);
});
