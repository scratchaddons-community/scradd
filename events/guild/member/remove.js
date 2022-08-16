import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../../common/moderation/logging.js";
import { closeModmail, getThreadFromMember } from "../../../common/modmail.js";

/** @type {import("../../../types/event").default<"guildMemberAdd">} */
const event = {
	async event(member) {
		if (member.guild.id !== process.env.GUILD_ID) return;
		await log(member.guild, `💨 Member ${member.toString()} left!`, "members");
		const channel = await member.guild.channels.fetch(process.env.PUBLIC_LOGS_CHANNEL || "");
		if (!channel?.isTextBased())
			throw new TypeError("PUBLIC_LOGS_CHANNEL isn’t a text channel");

		const byes = [
			`😩 Welp… **${member.user.username}** decided to leave… what a shame…`,
			`⬅ Ahh… **${member.user.username}** left us… hope they’ll have safe travels!`,
			`**${member.user.username}** made a bad decision and left! 😦 I wonder why… 🤔`,
			`👎 For some reason **${member.user.username}** didn’t like it here…`,
			`Can we get an F in the chat for **${member.user.username}**? They left! 😭`,
			`🍴 Oop, **${member.user.username}** got eaten by an evil kumquat and left!`,
		];

		const banned = await member.guild.bans
			.fetch(member)
			.then((partialBan) => {
				if (partialBan.partial) return partialBan.fetch();
				return partialBan;
			})
			.catch(() => {});

		const bans = [
			`😦 Oof… **${member.user.username}** got banned…`,
			`${CONSTANTS.emojis.statuses.no} There’s no turning back for the banned **${member.user.username}**…`,
			`👨‍🏫 Remember kids, don’t follow **${member.user.username}**’s example, it gets you banned.`,
			`😡 Oops, **${member.user.username}** angered the mods and was banned!`,
			`📜 **${member.user.username}** broke the rules and took an L`,
			`💬 **${member.user.username}** was banned for talking about opacity slider too much. (JK, that’s not why.)`,
		];

		await Promise.all([
			channel.send(
				(banned
					? bans[Math.floor(Math.random() * bans.length)]
					: byes[Math.floor(Math.random() * byes.length)]) || "",
			),
			getThreadFromMember(member).then(async (thread) => {
				if (thread) closeModmail(thread, member.user, "Member left");
			}),
		]);
	},
};

export default event;
