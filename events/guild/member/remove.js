import { closeModmail, getThreadFromMember } from "../../../common/modmail.js";

/**
 * @file Enables Error reporting.
 *
 * @type {import("../../../types/event").default<"guildMemberAdd">}
 */
const event = {
	async event(member) {
		if (member.guild.id !== process.env.GUILD_ID) return;
		const channel = await member.guild.channels.fetch(process.env.PUBLIC_LOGS_CHANNEL || "");
		if (!channel?.isText()) throw new Error("PUBLIC_LOGS_CHANNEL is not a text channel.");

		const byes = [
			`Welp… ${member.toString()} decided to leave… what a shame…`,
			`Ahh… ${member.toString()} left us… hope they’ll have safe travels!`,
			`${member.toString()} made a bad decision and left! 😦 I wonder why… 🤔`,
			`For some reason ${member.toString()} didn't like it here…`,
			`Can we get an F in the chat for ${member.toString()}? They left! 😭`,
		];

		const banned = await member.guild.bans
			.fetch(member)
			.then((partialBan) => {
				if (partialBan.partial) return partialBan.fetch();
				return partialBan;
			})
			.catch(() => {});

		const bans = [
			`Oof… ${member.toString()} got banned…`,
			`There's no turning back for the banned ${member.toString()}...`,
			`Remember kids, don't follow ${member.toString()}'s example, it gets you banned.`,
			`Oops, ${member.toString()} angered the mods and was banned!`,
			`${member.toString()} broke the rules and took an L`,
		];

		await Promise.all([
			channel.send({
				content: banned
					? bans[Math.floor(Math.random() * bans.length)] +
					  (banned.reason ? ` ${banned.reason}` : "")
					: byes[Math.floor(Math.random() * byes.length)],
			}),
			getThreadFromMember(member).then(async (thread) => {
				if (thread) closeModmail(thread, member);
			}),
		]);
	},
};

export default event;
