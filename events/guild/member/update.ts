import { time } from "discord.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import { changeNickname } from "../../../common/moderation/automod.js";
import log from "../../../common/moderation/logging.js";
import type Event from "../../../common/types/event";

const event: Event<"guildMemberUpdate"> = async function event(oldMember, newMember) {
	if (newMember.guild.id !== CONSTANTS.guild.id) return;
	const logs = [];
	if (oldMember.avatar !== newMember.avatar) {
		logs.push(
			newMember.avatar
				? " set their server avatar to <" + newMember.avatarURL() + ">"
				: " removed their server avatar",
		);
	}

	if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
		if (
			newMember.communicationDisabledUntil &&
			newMember.communicationDisabledUntil > new Date()
		)
			logs.push(" timed out until " + time(newMember.communicationDisabledUntil));
		else if (
			oldMember.communicationDisabledUntil &&
			oldMember.communicationDisabledUntil > new Date()
		)
			logs.push("’s timeout was removed");
	}
	if (oldMember.nickname !== newMember.nickname) {
		logs.push(
			newMember.nickname ? " was nicknamed " + newMember.nickname : "’s nickname was removed",
		);
	}
	if (
		newMember.roles.premiumSubscriberRole &&
		CONSTANTS.roles.epic &&
		CONSTANTS.channels.general &&
		!newMember.roles.resolve(CONSTANTS.roles.epic.id)
	) {
		await newMember.roles.add(CONSTANTS.roles.epic, "Boosted the server");
		await CONSTANTS.channels.general.send(
			`🎊 ${newMember.toString()} Thanks for boosting the server! Here's ${CONSTANTS.roles.epic.toString()} as a thank-you.`,
		);
	}
	await Promise.all(
		logs.map((edit) => log(`🫂 Member ${newMember.toString()}${edit}!`, "members")),
	);

	await changeNickname(newMember);
};
export default event;
