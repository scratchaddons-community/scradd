import {
	GuildMember,
	User,
	escapeMarkdown,
	time,
	TimestampStyles,
	ComponentType,
	ButtonStyle,
	InteractionReplyOptions,
	Snowflake,
	MessageType,
} from "discord.js";
import client from "../client.js";
import { userSettingsDatabase } from "../commands/settings.js";
import { GlobalUsersPattern } from "../util/discord.js";
import { convertBase } from "../util/numbers.js";
import CONSTANTS from "./CONSTANTS.js";
import Database from "./database.js";
import log, { getLoggingThread } from "./logging.js";
import giveXp, { DEFAULT_XP } from "./xp.js";

export const EXPIRY_LENGTH = 21,
	STRIKES_PER_MUTE = 3,
	MUTE_LENGTHS = [6, 12, 24],
	PARTIAL_STRIKE_COUNT = 1 / (STRIKES_PER_MUTE + 1),
	DEFAULT_STRIKES = 1;

export const strikeDatabase = new Database("strikes");
await strikeDatabase.init();

export default async function warn(
	user: import("discord.js").GuildMember | import("discord.js").User,
	reason: string,
	strikes: number = DEFAULT_STRIKES,
	contextOrMod: import("discord.js").User | string = client.user,
): Promise<void> {
	const allUserStrikes = strikeDatabase.data.filter(
		(strike) =>
			strike.user === user.id && strike.date + EXPIRY_LENGTH < Date.now() && !strike.removed,
	);

	const oldStrikeCount = allUserStrikes.reduce((acc, { count }) => count + acc, 0);
	const oldMuteCount = Math.trunc(oldStrikeCount / STRIKES_PER_MUTE);
	const oldMuteLength = MUTE_LENGTHS.reduce(
		(acc, length, index) => (index > oldMuteCount ? acc : acc + length),
		0,
	);

	strikes = Math.max(Math.round(strikes * 4) / 4, PARTIAL_STRIKE_COUNT);
	const totalVerbalStrikes = Math.floor((oldStrikeCount % 1) + (strikes % 1));
	const displayStrikes = Math.trunc(strikes) + totalVerbalStrikes;
	const mod = contextOrMod instanceof User ? contextOrMod : client.user;
	const context =
		(contextOrMod instanceof User ? "" : contextOrMod + (totalVerbalStrikes ? "\n\n" : "")) +
		(totalVerbalStrikes ? "Too many verbal strikes" : "");

	const logMessage = await log(
		`⚠ ${user.toString()} ${
			displayStrikes
				? `gained ${displayStrikes} strike${displayStrikes === 1 ? "" : "s"} from`
				: "verbally warned by"
		} ${mod.toString()}!`,
		"members",
		{
			files: [
				{
					attachment: Buffer.from(reason + (context && `\n>>> ${context}`), "utf-8"),
					name: "strike.txt",
				},
			],
		},
	);
	giveXp(user, logMessage.url, DEFAULT_XP * strikes * -1);

	const member =
		user instanceof GuildMember
			? user
			: await CONSTANTS.guild.members.fetch(user.id).catch(() => {});

	await user
		.send({
			embeds: [
				{
					title: `You were ${
						strikes
							? `warned${strikes > 1 ? ` ${strikes} times` : ""}`
							: "verbally warned"
					} in ${escapeMarkdown(CONSTANTS.guild.name)}!`,
					description: reason + (context && `\n>>> ${context}`),
					color: member?.displayColor,
					footer: {
						icon_url: CONSTANTS.guild.iconURL() ?? undefined,
						text:
							(displayStrikes
								? `${
										displayStrikes === 1 ? "This strike" : "These strikes"
								  } will expire in 21 ${
										process.env.NODE_ENV === "production" ? "day" : "minute"
								  }s.\n`
								: "") +
							"You may DM me to discuss this strike with the mods if you want.",
					},
				},
			],
		})
		.catch(() => {});

	strikeDatabase.data = [
		...strikeDatabase.data,
		{
			user: user.id,
			id: convertBase(logMessage.id, 10, convertBase.MAX_BASE),
			date: Date.now(),
			count: strikes,
			removed: false,
		},
	];

	const newStrikeCount = oldStrikeCount + strikes;

	if (Math.trunc(newStrikeCount) > MUTE_LENGTHS.length * STRIKES_PER_MUTE + 1) {
		// Ban
		if (
			member?.bannable &&
			!member.roles.premiumSubscriberRole &&
			(process.env.NODE_ENV === "production" || member.roles.highest.name === "@everyone")
		) {
			await member.ban({ reason: "Too many strikes" });
		} else {
			await CONSTANTS.channels.modlogs?.send({
				allowedMentions: { users: [] },
				content: `⚠ Missing permissions to ban ${user.toString()}.`,
			});
		}
		return;
	}

	const newMuteCount = Math.trunc(newStrikeCount / STRIKES_PER_MUTE);
	const newMuteLength = MUTE_LENGTHS.reduce(
		(acc, length, index) => (index > newMuteCount ? acc : acc + length),
		0,
	);
	const addedMuteLength = newMuteLength - oldMuteLength;

	if (addedMuteLength) {
		if (member?.moderatable) {
			await member.disableCommunicationUntil(
				addedMuteLength * (process.env.NODE_ENV === "production" ? 3_600_000 : 60_000) +
					Date.now(),
				"Too many strikes",
			);
		} else {
			await CONSTANTS.channels.modlogs?.send({
				allowedMentions: { users: [] },
				content: `⚠ Missing permissions to mute ${user.toString()} for ${addedMuteLength} ${
					process.env.NODE_ENV === "production" ? "hour" : "minute"
				}${addedMuteLength === 1 ? "" : "s"}.`,
			});
		}
	}

	if (Math.trunc(newStrikeCount) >= MUTE_LENGTHS.length * STRIKES_PER_MUTE) {
		await user.send(
			`__**This is your last chance. If you get another strike before ${time(
				Math.round((+(allUserStrikes[0]?.date || Date.now()) + EXPIRY_LENGTH) / 1000),
				TimestampStyles.LongDate,
			)}, you will be banned.**__`,
		);
	}
}
const databases = await (await getLoggingThread("databases")).messages.fetch({ limit: 100 });
const { url } =
	databases
		.find((message) => message.attachments.first()?.name === "robotop_warns.json")
		?.attachments.first() ?? {};
export const robotopStrikes: { id: number; mod: Snowflake; reason: string }[] = url
	? await fetch(url).then((response) => response.json())
	: [];

export async function filterToStrike(filter: string) {
	if (filter.match(/^\d{1,4}$/)) {
		const strike = strikeDatabase.data.find((strike) => strike.id + "" === filter);
		const info = robotopStrikes.find((strike) => strike.id + "" === filter);
		if (strike && info) return { ...info, ...strike, id: info.id + "" };
	}
	const channel = filter.startsWith("0")
		? CONSTANTS.channels.modlogs
		: await getLoggingThread("members");
	const messageId = convertBase(filter, convertBase.MAX_BASE, 10);

	const messageFromId = await channel?.messages.fetch(messageId).catch(() => {});
	const message = messageFromId || (await channel?.messages.fetch(filter).catch(() => {}));
	if (!message) return;

	const strikeId = messageFromId ? filter : convertBase(filter, 10, convertBase.MAX_BASE);
	const strike = strikeDatabase.data.find((strike) => strike.id + "" === strikeId);
	if (!strike) return;

	if (
		strikeId.startsWith("0") &&
		message.type === MessageType.AutoModerationAction &&
		message.embeds[0]
	) {
		return {
			...strike,
			mod: "643945264868098049",
			reason:
				message.embeds[0].fields.find((field) => field.name === "rule_name")?.value +
				"\n>>> " +
				message.embeds[0].description,
		};
	}

	const { url } = message.attachments.first() || {};
	return {
		...strike,
		mod: [...message.content.matchAll(GlobalUsersPattern)][1]?.[1],
		reason: url ? await fetch(url).then((response) => response.text()) : message.content,
	};
}

export async function getStrikeById(
	interactor: GuildMember,
	filter: string,
): Promise<InteractionReplyOptions> {
	const strike = await filterToStrike(filter);
	if (!strike)
		return { ephemeral: true, content: `${CONSTANTS.emojis.statuses.no} Invalid strike ID!` };

	const isMod = CONSTANTS.roles.mod && interactor.roles.resolve(CONSTANTS.roles.mod.id);
	if (strike.user !== interactor.id && !isMod)
		return {
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} You don't have permission to view this member's strikes!`,
		};

	const member = await CONSTANTS.guild?.members.fetch(strike.user).catch(() => {});
	const user = member?.user || (await client.users.fetch(strike.user).catch(() => {}));

	const mod = isMod && strike.mod && (await client.users.fetch(strike.mod).catch(() => {}));
	const nick = member?.displayName ?? user?.username;
	const useMentions =
		userSettingsDatabase.data.find((settings) => interactor.id === settings.user)
			?.useMentions ?? false;
	return {
		components:
			isMod && !strike.removed
				? [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									customId: strike.id + "_remove_strike",
									label: "Remove",
									style: ButtonStyle.Danger,
								},
							],
						},
				  ]
				: [],
		ephemeral: true,
		embeds: [
			{
				color: member?.displayColor,
				author: nick
					? { icon_url: (member || user)?.displayAvatarURL(), name: nick }
					: undefined,
				title: `${strike.removed ? "~~" : ""}Strike \`${strike.id}\`${
					strike.removed ? "~~" : ""
				}`,
				description: strike.reason,
				timestamp: new Date(strike.date).toISOString(),
				fields: [
					{
						name: "⚠ Count",
						value: "" + strike.count,
						inline: true,
					},
					...(mod
						? [
								{
									name: "🛡 Moderator",
									value: useMentions ? mod.toString() : mod.username,
									inline: true,
								},
						  ]
						: []),
					...(user
						? [
								{
									name: "👤 Target user",
									value: useMentions ? user.toString() : user.username,
									inline: true,
								},
						  ]
						: []),
					{
						name: "⏲ Date",
						value: time(new Date(strike.date), TimestampStyles.RelativeTime),
						inline: true,
					},
				],
			},
		],
	};
}
