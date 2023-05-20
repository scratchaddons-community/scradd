import { type MessageCreateOptions, time, TimestampStyles } from "discord.js";
import { client } from "../../lib/client.js";
import config from "../../common/config.js";
import { nth } from "../../util/numbers.js";
import { remindersDatabase, SpecialReminders } from "../reminders.js";
import { getSettings } from "../settings.js";
import { getFullWeeklyData, recentXpDatabase, xpDatabase } from "./misc.js";

export async function getChatters() {
	const weeklyWinners = getFullWeeklyData();
	weeklyWinners.splice(
		0,
		weeklyWinners.findIndex(
			(gain, index) => index > 3 && gain.xp !== weeklyWinners[index + 1]?.xp,
		),
	);
	if (!weeklyWinners.length) return;

	const promises = weeklyWinners.map(
		async (user) =>
			`${weeklyWinners.findIndex((found) => found.xp === user.xp) + 6}) ${
				(await client.users.fetch(user.user)).username
			} - ${user.xp.toLocaleString("en-us")}`,
	);
	return "```\n" + (await Promise.all(promises)).join("\n").replaceAll("```", "'''") + "\n```";
}

export default async function getWeekly(nextWeeklyDate: Date) {
	remindersDatabase.data = [
		...remindersDatabase.data,
		{
			channel: config.channels.announcements?.id || "",
			date: Number(nextWeeklyDate),
			reminder: undefined,
			id: SpecialReminders.Weekly,
			user: client.user.id,
		},
	];
	const weeklyWinners = getFullWeeklyData();
	recentXpDatabase.data = recentXpDatabase.data.filter(
		({ time }) => time && time + 604_800_000 < Date.now(),
	);

	const { active } = config.roles;
	const activeMembers = weeklyWinners.filter((item) => item.xp > 350);
	if (active) {
		await Promise.all([
			...active.members.map(async (roleMember) => {
				if (!activeMembers.some((item) => item.user === roleMember.id))
					return await roleMember.roles.remove(active, "Inactive");
			}),
			...activeMembers.map(
				async ({ user: memberId }) =>
					await config.guild.members
						.fetch(memberId)
						.catch(() => {})
						.then((activeMember) => activeMember?.roles.add(active, "Active")),
			),
		]);
	}

	const date = new Date();
	date.setUTCDate(date.getUTCDate() - 7);
	const chatters = weeklyWinners.length;
	const allXp = Math.floor(weeklyWinners.reduce((one, two) => one + two.xp, 0));

	weeklyWinners.splice(
		weeklyWinners.findIndex(
			(gain, index) => index > 3 && gain.xp !== weeklyWinners[index + 1]?.xp,
		) + 1,
	);
	const ids = weeklyWinners.map((gain) => gain.user);

	const role = config.roles.weekly_winner;
	if (role) {
		await Promise.all([
			...role.members.map(async (weeklyMember) => {
				if (!ids.includes(weeklyMember.id))
					return await weeklyMember.roles.remove(role, `No longer weekly winner`);
			}),
			...weeklyWinners.map(
				async ({ user: userId }, index) =>
					await config.guild.members
						.fetch(userId)
						.catch(() => {})
						.then((member) =>
							member?.roles.add(
								index || !config.roles.epic ? role : [role, config.roles.epic],
								`Weekly winner`,
							),
						),
			),
		]);
	}

	return {
		allowedMentions: { users: ids.filter((id) => getSettings({ id }).weeklyPings) },

		content: `__**🏆 Weekly Winners week of ${
			[
				"January",
				"February",
				"March",
				"April",
				"May",
				"June",
				"July",
				"August",
				"September",
				"October",
				"November",
				"December",
			][date.getUTCMonth()] || ""
		} ${nth(date.getUTCDate(), {
			bold: false,
			jokes: false,
		})}**__\n${
			weeklyWinners
				.map(
					(gain, index) =>
						`${["🥇", "🥈", "🥉"][index] || "🏅"} <@${gain.user}> - ${Math.floor(
							gain.xp *
								Math.sign(
									xpDatabase.data.find(({ user }) => user === gain.user)?.xp || 1,
								),
						).toLocaleString("en-us")} XP`,
				)
				.join("\n") || "*Nobody got any XP this week!*"
		}\n\n*This week, ${chatters.toLocaleString(
			"en-us",
		)} people chatted, and ${activeMembers.length.toLocaleString(
			"en-us",
		)} people were active. Altogether, people gained ${allXp.toLocaleString(
			"en-us",
		)} XP this week.*\n__Next week’s weekly winners will be posted ${time(
			nextWeeklyDate,
			TimestampStyles.RelativeTime,
		)}.__`,
	} satisfies MessageCreateOptions;
}
