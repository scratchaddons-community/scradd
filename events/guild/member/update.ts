import { time } from "discord.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import { changeNickname } from "../../../common/automod.js";
import log from "../../../common/logging.js";
import type Event from "../../../common/types/event";

const event: Event<"guildMemberUpdate"> = async function event(oldMember, newMember) {
	if (newMember.guild.id !== CONSTANTS.guild.id) return;
	const logs = [];
	if (oldMember.avatar !== newMember.avatar) {
		const avatarURL = newMember.avatarURL({ size: 128, forceStatic: false });
		const response = avatarURL && (await fetch(avatarURL));
		await log(
			`🫂 Member ${newMember.toString()} ${
				response ? `changed` : "removed"
			} their server avatar!`,
			"members",
			{ files: response ? [Buffer.from(await response.arrayBuffer())] : [] },
		);
	}

	if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
		if (
			newMember.communicationDisabledUntil &&
			+newMember.communicationDisabledUntil > Date.now()
		)
			logs.push(" timed out until " + time(newMember.communicationDisabledUntil));
		else if (
			oldMember.communicationDisabledUntil &&
			+oldMember.communicationDisabledUntil > Date.now()
		)
			logs.push("’s timeout was removed");
	}
	if (oldMember.nickname !== newMember.nickname) {
		logs.push(
			newMember.nickname ? " was nicknamed " + newMember.nickname : "’s nickname was removed",
		);
	}
	if (newMember.roles.premiumSubscriberRole && CONSTANTS.roles.booster) {
		await newMember.roles.add(CONSTANTS.roles.booster, "Boosted the server");
	}
	await Promise.all(
		logs.map((edit) => log(`🫂 Member ${newMember.toString()}${edit}!`, "members")),
	);

	await changeNickname(newMember);
};
export default event;
