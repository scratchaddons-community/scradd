import { changeNickname } from "../../../common/moderation/automod.js";
import log from "../../../common/moderation/logging.js";

/** @type {import("../../../types/event").default<"guildMemberUpdate">} */
const event = {
	async event(oldMember, newMember) {
		if (newMember.guild.id !== process.env.GUILD_ID) return;
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
				newMember.communicationDisabledUntil < new Date()
			)
				logs.push(
					" timed out until <t:" +
						Math.round(+newMember.communicationDisabledUntil / 1_000) +
						">",
				);

			if (!newMember.communicationDisabledUntil) logs.push(" un timed out");
		}
		if (oldMember.nickname !== newMember.nickname) {
			logs.push(
				newMember.nickname
					? " was nicknamed " + newMember.nickname
					: "’s nickname was removed",
			);
		}
		await Promise.all(
			logs.map((edit) =>
				log(newMember.guild, `Member ${newMember.toString()}${edit}!`, "members"),
			),
		);

		await changeNickname(newMember);
	},
};

export default event;
