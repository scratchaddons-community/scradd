import warn from "../../../common/moderation/warns.js";
import { censor } from "../../../common/moderation/automod.js";
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
			logs.push(
				newMember.communicationDisabledUntil
					? " timed out until <t:" +
							Math.round(+newMember.communicationDisabledUntil / 1_000) +
							">"
					: " un timed out",
			);
		}
		if (oldMember.nickname !== newMember.nickname) {
			logs.push(
				newMember.nickname
					? " was nicknamed " + newMember.nickname
					: "'s nickname was removed",
			);
		}
		await Promise.all(
			logs.map((edit) =>
				log(newMember.guild, `Member ${newMember.toString()}${edit}!`, "members"),
			),
		);

		const censored = censor(newMember.displayName);
		if (censored) {
			const modTalk = newMember.guild.publicUpdatesChannel;
			if (!modTalk) throw new ReferenceError("Could not find mod talk");
			await (newMember.moderatable
				? newMember.setNickname(censored.censored)
				: modTalk.send({
						allowedMentions: { users: [] },
						content: `Missing permissions to change ${newMember.toString()}'s nickname to \`${
							censored.censored
						}\`.`,
				  }));
			await warn(
				newMember,
				`Watch your language!`,
				censored.strikes,
				"Changed nickname to:\n" + newMember.displayName,
			);
		}
	},
};

export default event;
