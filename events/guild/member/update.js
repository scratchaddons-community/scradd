import { time } from "discord.js";
import { guild } from "../../../client.js";
import { changeNickname } from "../../../common/moderation/automod.js";
import log from "../../../common/moderation/logging.js";

/** @type {import("../../../types/event").default<"guildMemberUpdate">} */
export default async function event(oldMember, newMember) {
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
			logs.push(" timed out until " + time(newMember.communicationDisabledUntil));

		if (!newMember.communicationDisabledUntil) logs.push(" un timed out");
	}
	if (oldMember.nickname !== newMember.nickname) {
		logs.push(
			newMember.nickname ? " was nicknamed " + newMember.nickname : "’s nickname was removed",
		);
	}
	if (
		newMember.roles.premiumSubscriberRole &&
		!newMember.roles.resolve(process.env.EPIC_ROLE || "")
	) {
		const channel = await guild.channels.fetch(process.env.PUBLIC_LOGS_CHANNEL || "");
		if (channel?.isTextBased())
			await channel.send(
				`🎊 ${newMember.toString()} Thanks for boosting the server! Here's <@&${
					process.env.EPIC_ROLE
				}> as a thank-you.`,
			);
	}
	await Promise.all(
		logs.map((edit) => log(`🫂 Member ${newMember.toString()}${edit}!`, "members")),
	);

	await changeNickname(newMember);
}
