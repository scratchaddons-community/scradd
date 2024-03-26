import {
	TimestampStyles,
	time,
	userMention,
	type MessageCreateOptions,
	type Snowflake,
} from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { SpecialReminders, remindersDatabase } from "../reminders/misc.js";
import { recheckMemberRole } from "../roles/custom.js";
import { getFullWeeklyData, recentXpDatabase } from "./util.js";

export async function getChatters(): Promise<MessageCreateOptions | undefined> {
	const weeklyWinners = getFullWeeklyData();
	const winnerId = weeklyWinners[0]?.user;
	const winner =
		winnerId &&
		(await config.guild.members
			.fetch(winnerId)
			.catch(() => client.users.fetch(winnerId).catch(() => void 0)));
	weeklyWinners.splice(
		0,
		weeklyWinners.findIndex(
			(gain, index) => index > 3 && gain.xp !== weeklyWinners[index + 1]?.xp,
		) + 1 || weeklyWinners.length,
	);
	if (!weeklyWinners.length) return;

	const formatted = weeklyWinners.map(
		(user) =>
			`${weeklyWinners.findIndex((found) => found.xp === user.xp) + 6}) ${userMention(
				user.user,
			)} - ${Math.floor(user.xp).toLocaleString()} XP`,
	);

	while (formatted.join("\n").length > 4096) formatted.pop();
	const ending = ` ${(weeklyWinners[formatted.length]?.xp ?? 0).toLocaleString()} XP`;
	const filtered = ending ? formatted.filter((line) => !line.endsWith(ending)) : formatted;

	return {
		embeds: [
			{
				description: filtered.join("\n"),
				footer:
					ending ?
						{
							icon_url: config.guild.iconURL() ?? undefined,
							text: `${
								weeklyWinners.length - filtered.length
							} more users with <=${ending}`,
						}
					:	undefined,
				color: constants.themeColor,
				thumbnail: winner ? { url: winner.displayAvatarURL() } : undefined,
			},
		],
	};
}

export default async function getWeekly(nextWeeklyDate: Date): Promise<string> {
	if (config.channels.announcements) {
		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel: config.channels.announcements.id,
				date: Number(nextWeeklyDate),
				reminder: undefined,
				id: SpecialReminders.Weekly,
				user: client.user.id,
			},
		];
	}

	const weeklyWinners = getFullWeeklyData();

	const latestActiveMembers = weeklyWinners
		.filter((item) => item.xp >= 300)
		.map((item) => item.user);
	const activeMembers = new Set([
		...latestActiveMembers,
		...Object.entries(
			recentXpDatabase.data.reduce<Record<Snowflake, number>>((accumulator, gain) => {
				accumulator[gain.user] = (accumulator[gain.user] ?? 0) + gain.xp;
				return accumulator;
			}, {}),
		)
			.filter(([, xp]) => xp >= 500)
			.map((entry) => entry[0]),
	]);

	if (config.roles.active) {
		for (const [, member] of config.roles.active.members) {
			if (activeMembers.has(member.id)) continue;
			await member.roles.remove(config.roles.active, "Inactive");
		}
	}

	recentXpDatabase.data = recentXpDatabase.data.filter(
		(entry) => entry.time + 604_800_000 > Date.now(),
	);

	const date = new Date();
	date.setUTCDate(date.getUTCDate() - 7);
	const chatters = weeklyWinners.length;
	const allXp = Math.floor(weeklyWinners.reduce((one, two) => one + two.xp, 0));

	weeklyWinners.splice(
		weeklyWinners.findIndex(
			(gain, index) => index > 3 && gain.xp !== weeklyWinners[index + 1]?.xp,
		) + 1 || weeklyWinners.length,
	);
	const ids = new Set(weeklyWinners.map((gain) => gain.user));

	const role = config.roles.weeklyWinner;
	if (role) {
		for (const [, weeklyMember] of role.members) {
			if (!ids.has(weeklyMember.id))
				await weeklyMember.roles.remove(role, "No longer weekly winner");
		}

		for (const [index, { user }] of weeklyWinners.entries()) {
			const member = await config.guild.members.fetch(user).catch(() => void 0);
			await member?.roles.add(
				index || !config.roles.epic ? role : [role, config.roles.epic],
				"Weekly winner",
			);
		}
	}

	for (const winner of weeklyWinners) {
		const member = await config.guild.members.fetch(winner.user).catch(() => void 0);
		if (member) await recheckMemberRole(member, member);
	}

	return `## 🏆 Weekly Winners week of ${new Date().toLocaleString([], {
		month: "long",
		day: "numeric",
	})}\n${
		weeklyWinners
			.map(
				(gain, index) =>
					`${["🥇", "🥈", "🥉"][index] || "🏅"} ${userMention(gain.user)} - ${Math.floor(
						gain.xp,
					).toLocaleString()} XP`,
			)
			.join("\n") || "*Nobody got any XP this week!*"
	}\n\n*This week, ${chatters.toLocaleString()} people chatted, and ${latestActiveMembers.length.toLocaleString()} people were active. Altogether, people gained ${allXp.toLocaleString()} XP this week.*\n### Next week’s weekly winners will be posted ${time(
		nextWeeklyDate,
		TimestampStyles.RelativeTime,
	)}.`;
}
