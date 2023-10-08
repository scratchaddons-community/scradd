import {
	ButtonStyle,
	ComponentType,
	GuildMember,
	Message,
	MessageType,
	User,
	type Snowflake,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { getDefaultSettings, getSettings } from "../settings.js";
import { DEFAULT_XP, getLevelForXp, getXpForLevel, recentXpDatabase, xpDatabase } from "./misc.js";

const latestMessages: Record<Snowflake, Message[]> = {};

export async function giveXpForMessage(message: Message) {
	if (!latestMessages[message.channel.id]) {
		const fetched = await message.channel.messages
			.fetch({ limit: 100, before: message.id })
			.then((messages) => messages.toJSON());

		const accumulator: Message[] = [];
		for (let index = 0; index < fetched.length && accumulator.length < DEFAULT_XP; index++) {
			const item = fetched[index];
			if (item && (!item.author.bot || item.interaction)) accumulator.push(item);
		}
		latestMessages[message.channel.id] = accumulator;
	}
	const lastInChannel = latestMessages[message.channel.id] ?? [];
	const spam = lastInChannel.findIndex((foundMessage) => {
		return ![message.author.id, message.interaction?.user.id].some((user) =>
			[foundMessage.author.id, foundMessage.interaction?.user.id].includes(user),
		);
	});

	const newChannel = lastInChannel.length < DEFAULT_XP;
	if (!newChannel) lastInChannel.pop();
	lastInChannel.unshift(message);
	const bot = 1 + Number(Boolean(message.interaction));

	await giveXp(
		message.interaction?.user || message.author,
		message.url,
		spam === -1 && !newChannel
			? 1
			: Math.max(
					1,
					Math.round(
						(DEFAULT_XP - (newChannel ? lastInChannel.length - 1 : spam)) /
							bot /
							(1 +
								Number(
									![
										MessageType.Default,
										MessageType.GuildBoost,
										MessageType.GuildBoostTier1,
										MessageType.GuildBoostTier2,
										MessageType.GuildBoostTier3,
										MessageType.Reply,
										MessageType.ChatInputCommand,
										MessageType.ContextMenuCommand,
									].includes(message.type),
								)),
					),
			  ),
	);
}

/**
 * Give XP to a user.
 *
 * @param to - Who to give the XP to.
 * @param url - A link to a message or other that gave them this XP.
 * @param amount - How much XP to give.
 */
export default async function giveXp(to: User | GuildMember, url?: string, amount = DEFAULT_XP) {
	const user = to instanceof User ? to : to.user;
	if (process.env.NODE_ENV === "production" && user.bot) return;
	const member =
		user instanceof GuildMember
			? user
			: await config.guild.members.fetch(user).catch(() => void 0);

	const xp = [...xpDatabase.data];
	const xpDatabaseIndex = xp.findIndex((entry) => entry.user === user.id);
	const oldXp = xp[xpDatabaseIndex]?.xp || 0;
	const newXp = oldXp === 0 && amount < 0 ? 0 : oldXp + amount * (Math.sign(oldXp) || 1);

	if (xpDatabaseIndex === -1) xp.push({ user: user.id, xp: amount });
	else xp[xpDatabaseIndex] = { user: user.id, xp: newXp };

	xpDatabase.data = xp;

	const oldLevel = getLevelForXp(Math.abs(oldXp));
	const newLevel = getLevelForXp(Math.abs(newXp));
	if (oldLevel < newLevel && member) await sendLevelUpMessage(member, newXp, url);

	const sorted = xp.toSorted((one, two) => two.xp - one.xp);

	const members = await config.guild.members.fetch();
	const serverRank = sorted
		.filter(({ user }) => members.has(user))
		.findIndex((info) => info.user === user.id);

	const rank = sorted.findIndex((info) => info.user === user.id);

	if (
		(config.guild.memberCount > 2000
			? rank < 20
			: serverRank / config.guild.memberCount < 0.01) &&
		member &&
		config.roles.epic &&
		!member.roles.resolve(config.roles.epic.id)
	) {
		await member.roles.add(config.roles.epic, "Top 1% of the server’s XP");
		await config.channels.general?.send(
			`🎊 ${member.toString()} Congratulations on being in the top 1% of the server’s XP! You have earned ${config.roles.epic.toString()}.`,
		);
	}

	const weekly = [...recentXpDatabase.data];
	const weeklyIndex = weekly.findIndex(
		(entry) => entry.user === user.id && entry.time + 3_600_000 > Date.now(),
	);
	const weeklyAmount = (weekly[weeklyIndex]?.xp || 0) + amount;
	if (weeklyIndex === -1) {
		weekly.push({ user: user.id, xp: weeklyAmount, time: Date.now() });
	} else {
		weekly[weeklyIndex] = {
			user: user.id,
			xp: weeklyAmount,
			time: weekly[weeklyIndex]?.time ?? Date.now(),
		};
	}
	recentXpDatabase.data = weekly;
}

async function sendLevelUpMessage(member: GuildMember, newXp: number, url?: string) {
	const newLevel = getLevelForXp(Math.abs(newXp));
	const nextLevelXp = getXpForLevel(newLevel + 1) * Math.sign(newXp);
	const showButton = (await getSettings(member, false)).levelUpPings === undefined;
	const pingsDefault = (await getDefaultSettings(member)).levelUpPings;

	await config.channels.bots?.send({
		allowedMentions: (await getSettings(member)).levelUpPings ? undefined : { users: [] },
		content: `🎉 ${member.toString()}`,
		components: showButton
			? [
					{
						components: [
							{
								customId: "levelUpPings_toggleSetting",
								type: ComponentType.Button,
								label: `${pingsDefault ? "Disable" : "Enable"} Pings`,
								style: ButtonStyle.Success,
							},
						],
						type: ComponentType.ActionRow,
					},
			  ]
			: [],

		embeds: [
			{
				color: member.displayColor,
				author: { icon_url: member.displayAvatarURL(), name: member.displayName },
				title: `You’re at level ${newLevel * Math.sign(newXp)}!`,
				url,

				fields: [
					{
						name: "✨ Current XP",
						value: `${Math.floor(newXp).toLocaleString("en-us")} XP`,
						inline: true,
					},
					{
						name: constants.zeroWidthSpace,
						value: constants.zeroWidthSpace,
						inline: true,
					},
					{
						name: Math.sign(newXp) === -1 ? "⬇ Previous level" : "⬆️ Next level",
						value: `${nextLevelXp.toLocaleString("en-us")} XP`,
						inline: true,
					},
				],

				footer: {
					icon_url: config.guild.iconURL() ?? undefined,
					text: `View your XP with /xp rank${
						showButton ? "" : "\nToggle pings with /settings"
					}`,
				},
			},
		],
	});
}
