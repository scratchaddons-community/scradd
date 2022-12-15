import { GuildMember, User, escapeMarkdown, time, TimestampStyles } from "discord.js";
import client from "../client.js";
import { convertBase } from "../util/numbers.js";
import CONSTANTS from "./CONSTANTS.js";
import Database from "./database.js";
import log from "./logging.js";
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
		(strike) => strike.user === user.id && strike.expiresAt < +new Date(),
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
	giveXp(user, DEFAULT_XP * strikes * -1);
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

	const expiresAt = new Date()[process.env.NODE_ENV === "production" ? "setDate" : "setMinutes"](
		new Date()[process.env.NODE_ENV === "production" ? "getDate" : "getMinutes"]() +
			EXPIRY_LENGTH,
	);
	strikeDatabase.data = [
		...strikeDatabase.data,
		{
			user: user.id,
			info: convertBase(logMessage.id, 10, convertBase.MAX_BASE),
			expiresAt,
			count: strikes,
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
				Math.round((allUserStrikes[0]?.expiresAt || expiresAt) / 1000),
				TimestampStyles.LongDate,
			)}, you will be banned.**__`,
		);
	}
}
