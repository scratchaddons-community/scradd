import { MessageCreateOptions, time, TimestampStyles } from "discord.js";
import client from "../../client.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import { nth } from "../../util/numbers.js";
import { remindersDatabase, SpecialReminders } from "../reminders.js";
import { getSettings } from "../settings.js";
import { weeklyXpDatabase, xpDatabase } from "./misc.js";

export default async function getWeekly(nextWeeklyDate: Date) {
	remindersDatabase.data = [
		...remindersDatabase.data,
		{
			channel: CONSTANTS.channels.announcements?.id || "",
			date: Number(nextWeeklyDate),
			reminder: undefined,
			id: SpecialReminders.Weekly,
			user: client.user.id,
		},
	];
	const weeklyWinners = [...weeklyXpDatabase.data].sort((one, two) => two.xp - one.xp);
	weeklyXpDatabase.data = [];

	const { active } = CONSTANTS.roles;
	const activeMembers = weeklyWinners.filter((item) => item.xp > 350);
	if (active) {
		await Promise.all([
			...active.members.map(async (roleMember) => {
				if (!activeMembers.some((item) => item.user === roleMember.id))
					return await roleMember.roles.remove(active, "Inactive");
			}),
			...activeMembers.map(
				async ({ user: memberId }) =>
					await CONSTANTS.guild.members
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

	const role = CONSTANTS.roles.weekly_winner;
	if (role) {
		await Promise.all([
			...role.members.map(async (weeklyMember) => {
				if (!ids.includes(weeklyMember.id))
					return await weeklyMember.roles.remove(role, `No longer weekly winner`);
			}),
			...weeklyWinners.map(
				async ({ user: userId }, index) =>
					await CONSTANTS.guild.members
						.fetch(userId)
						.catch(() => {})
						.then((member) =>
							member?.roles.add(
								index || !CONSTANTS.roles.epic
									? role
									: [role, CONSTANTS.roles.epic],
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
						).toLocaleString()} XP`,
				)
				.join("\n") || "*Nobody got any XP this week!*"
		}\n\n*This week, ${chatters.toLocaleString()} people chatted, and ${activeMembers.length.toLocaleString()} people were active. Altogether, people gained ${allXp.toLocaleString()} XP this week.*\n__Next week’s weekly winners will be posted ${time(
			nextWeeklyDate,
			TimestampStyles.RelativeTime,
		)}.__`,
	} satisfies MessageCreateOptions;
}
