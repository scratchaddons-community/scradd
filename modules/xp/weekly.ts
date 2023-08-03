import { type MessageCreateOptions, time, TimestampStyles, type Snowflake } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import { nth } from "../../util/numbers.js";
import { remindersDatabase, SpecialReminders } from "../reminders.js";
import { getFullWeeklyData, recentXpDatabase, xpDatabase } from "./misc.js";
import constants from "../../common/constants.js";
import { qualifiesForRole } from "../roles.js";

export async function getChatters() {
	const weeklyWinners = getFullWeeklyData();
	const winnerId = weeklyWinners[0]?.user;
	const winner =
		winnerId &&
		(await config.guild.members
			.fetch(winnerId)
			.catch(() => client.users.fetch(winnerId).catch(() => {})));
	weeklyWinners.splice(
		0,
		weeklyWinners.findIndex(
			(gain, index) => index > 3 && gain.xp !== weeklyWinners[index + 1]?.xp,
		) + 1 || weeklyWinners.length,
	);
	if (!weeklyWinners.length) return;

	const formatted = await Promise.all(
		weeklyWinners.map(
			async (user) =>
				`${weeklyWinners.findIndex((found) => found.xp === user.xp) + 6}) ${
					(
						await client.users
							.fetch(user.user)
							.catch(() => ({ displayName: user.user + "#" }))
					).displayName
				} - ${Math.floor(user.xp).toLocaleString("en-us")} XP`,
		),
	);

	while (formatted.join("\n").length > 4096) formatted.pop();
	const ending =
		weeklyWinners[formatted.length] &&
		` ${weeklyWinners[formatted.length]?.xp.toLocaleString("en-us")} XP`;
	const filtered = ending ? formatted.filter((line) => !line.endsWith(ending)) : formatted;

	return {
		embeds: [
			{
				description: "```\n" + filtered.join("\n").replaceAll("```", "'''") + "\n```",
				footer: ending
					? {
							icon_url: config.guild.iconURL() ?? undefined,
							text: `${
								weeklyWinners.length - filtered.length
							} more users with <=${ending}`,
					  }
					: undefined,
				color: constants.themeColor,
				thumbnail: winner ? { url: winner?.displayAvatarURL() } : undefined,
			},
		],
	} satisfies MessageCreateOptions;
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

	const { active } = config.roles;
	const latestActiveMembers = weeklyWinners.filter((item) => item.xp >= 300);
	const activeMembers = [
		...latestActiveMembers,
		...Object.entries(
			recentXpDatabase.data.reduce<Record<Snowflake, number>>((acc, gain) => {
				acc[gain.user] = (acc[gain.user] ?? 0) + gain.xp;
				return acc;
			}, {}),
		)
			.map((entry) => ({ xp: entry[1], user: entry[0] }))
			.filter((item) => item.xp >= 500),
	];
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

	recentXpDatabase.data = recentXpDatabase.data.filter(
		({ time }) => time + 604_800_000 > Date.now(),
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
				
	const customRoles = (await config.guild.roles.fetch()).filter((role) => role.name.toLowerCase().includes("✨ "));
	weeklyWinners.forEach(async (weeklyWinner) => {
		await config.guild.members.fetch(weeklyWinner.user)
			.then(async (guildMember) => {
				const filtered = customRoles.filter((customRole) => {
					const member = customRole.members.find((member) => member.id === guildMember.id);
					return member !== undefined;
				});
				
				if (filtered.size === 0) return;
				if (await qualifiesForRole(guildMember)) return;

				guildMember.roles.remove(
					filtered,
					"No Longer meets the requirements to have a Custom Role"
				);

				filtered.forEach((role) => {
					config.guild.roles.delete(
						role,
						"Custom Role no longer usable"
					)
				});
			});
	});

	return `__**🏆 Weekly Winners week of ${
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
	} ${nth(date.getUTCDate(), { bold: false, jokes: false })}**__\n${
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
	)} people chatted, and ${latestActiveMembers.length.toLocaleString(
		"en-us",
	)} people were active. Altogether, people gained ${allXp.toLocaleString(
		"en-us",
	)} XP this week.*\n__Next week’s weekly winners will be posted ${time(
		nextWeeklyDate,
		TimestampStyles.RelativeTime,
	)}.__`;
}
