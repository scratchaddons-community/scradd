import {
	ButtonStyle,
	ComponentType,
	GuildMember,
	type Message,
	MessageType,
	User,
	type Snowflake,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { getDefaultSettings, getSettings } from "../settings.js";
import { DEFAULT_XP, getLevelForXp, getXpForLevel } from "./misc.js";
import { recentXpDatabase, xpDatabase } from "./util.js";

const latestMessages: Record<Snowflake, Message[]> = {};

export async function giveXpForMessage(message: Message): Promise<void> {
	if (!latestMessages[message.channel.id]) {
		const fetched = await message.channel.messages
			.fetch({ limit: 100, before: message.id })
			.then((messages) => [...messages.values()]);

		const accumulator: Message[] = [];
		for (let index = 0; index < fetched.length && accumulator.length < DEFAULT_XP; index++) {
			const item = fetched[index];
			if (item && (!item.author.bot || item.interaction)) accumulator.push(item);
		}
		latestMessages[message.channel.id] = accumulator;
	}
	const lastInChannel = latestMessages[message.channel.id] ?? [];
	const spam = lastInChannel.findIndex((foundMessage) => {
		return ![message.author.id, message.interaction?.user.id || ""].some((user) =>
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
										MessageType.RoleSubscriptionPurchase,
										MessageType.GuildApplicationPremiumSubscription,
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
export default async function giveXp(
	to: GuildMember | User,
	url?: string,
	amount = DEFAULT_XP,
): Promise<void> {
	const user = to instanceof User ? to : to.user;
	if (process.env.NODE_ENV === "production" && user.bot) return;
	const member =
		user instanceof GuildMember
			? user
			: await config.guild.members.fetch(user).catch(() => void 0);

	const xp = [...xpDatabase.data];
	const xpDatabaseIndex = xp.findIndex((entry) => entry.user === user.id);
	const oldXp = xp[xpDatabaseIndex]?.xp || 0;
	const newXp = oldXp === 0 && amount < 0 ? 0 : oldXp + amount;

	if (xpDatabaseIndex === -1) xp.push({ user: user.id, xp: amount });
	else xp[xpDatabaseIndex] = { user: user.id, xp: newXp };

	xpDatabase.data = xp;

	const oldLevel = getLevelForXp(oldXp);
	const newLevel = getLevelForXp(newXp);
	if (oldLevel < newLevel && member) await sendLevelUpMessage(member, newXp, url);

	const sorted = xp.toSorted((one, two) => two.xp - one.xp);

	const guildMembers = await config.guild.members.fetch();
	const serverRank = sorted
		.filter((entry) => guildMembers.has(entry.user))
		.findIndex((entry) => entry.user === user.id);

	const rank = sorted.findIndex((info) => info.user === user.id);

	if (
		(config.guild.memberCount > 2000
			? serverRank / config.guild.memberCount < 0.01
			: rank < 20) &&
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

async function sendLevelUpMessage(member: GuildMember, newXp: number, url?: string): Promise<void> {
	const newLevel = getLevelForXp(newXp);
	const nextLevelXp = getXpForLevel(newLevel + 1);
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
				title: `You’re at level ${newLevel}!`,
				url,

				fields: [
					{
						name: "✨ Current XP",
						value: `${Math.floor(newXp).toLocaleString()} XP`,
						inline: true,
					},
					{ name: constants.zws, value: constants.zws, inline: true },
					{
						name: "⬆️ Next level",
						value: `${nextLevelXp.toLocaleString()} XP`,
						inline: true,
					},
				],

				footer: {
					icon_url: config.guild.iconURL() ?? undefined,
					text: `View your XP with /xp rank${
						showButton ? "" : "\nToggle pings via /settings"
					}`,
				},
			},
		],
	});
}
