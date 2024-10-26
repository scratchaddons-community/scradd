import {
	ButtonStyle,
	ComponentType,
	GuildMember,
	TimestampStyles,
	User,
	time,
	userMention,
	type ButtonInteraction,
	type InteractionResponse,
} from "discord.js";
import { escapeAllMarkdown, client, footerSeperator } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { convertBase } from "../../util/numbers.js";
import log from "../logging/misc.js";
import { LogSeverity, LoggingEmojis, LoggingEmojisError } from "../logging/util.js";
import giveXp from "../xp/give-xp.js";
import {
	DEFAULT_STRIKES,
	EXPIRY_LENGTH,
	MAX_STRIKES,
	MUTE_LENGTHS,
	PARTIAL_STRIKE_COUNT,
	STRIKES_PER_MUTE,
	XP_PUNISHMENT,
} from "./misc.js";
import filterToStrike, { strikeDatabase } from "./util.js";

export default async function warn(
	user: GuildMember | User,
	reason: string,
	rawStrikes: number = DEFAULT_STRIKES,
	contextOrModerator: User | string = client.user,
): Promise<boolean | "no-dm"> {
	if ((user instanceof GuildMember ? user.user : user).bot) return false;
	const allUserStrikes = strikeDatabase.data.filter(
		(strike) =>
			strike.user === user.id && strike.date + EXPIRY_LENGTH > Date.now() && !strike.removed,
	);

	const oldStrikeCount = allUserStrikes.reduce(
		(accumulator, { count }) => count + accumulator,
		0,
	);
	const oldMuteCount = Math.trunc(oldStrikeCount / STRIKES_PER_MUTE);
	const oldMuteLength = MUTE_LENGTHS.reduce(
		(accumulator, length, index) => (index < oldMuteCount ? accumulator + length : accumulator),
		0,
	);

	const strikes = Math.min(
		MAX_STRIKES,
		Math.max(Math.round(rawStrikes * 4) / 4, PARTIAL_STRIKE_COUNT),
	);
	const displayStrikes = Math.max(Math.trunc(strikes), 1);
	const moderator = contextOrModerator instanceof User ? contextOrModerator : client.user;
	const context = contextOrModerator instanceof User ? "" : contextOrModerator;
	const logMessage = await log(
		`${LoggingEmojis.Punishment} ${user.toString()} ${
			strikes > 0.5 ?
				`warned ${displayStrikes} time${displayStrikes === 1 ? "" : "s"}`
			:	"verbally warned"
		} by ${moderator.toString()}`,
		LogSeverity.ImportantUpdate,
		{ files: [{ content: reason + (context && `\n>>> ${context}`), extension: "md" }] },
	);

	const member =
		user instanceof GuildMember ? user : (
			await config.guild.members.fetch(user.id).catch(() => void 0)
		);

	const id = convertBase(logMessage.id, 10, convertBase.MAX_BASE);

	const dm = await user
		.send({
			embeds: [
				{
					title: `You were ${
						strikes > 0.5 ?
							`warned${displayStrikes > 1 ? ` ${displayStrikes} times` : ""}`
						:	"verbally warned"
					} in ${escapeAllMarkdown(config.guild.name)}!`,

					description: reason + (context && `\n>>> ${context}`),
					color: member?.displayColor,

					footer: {
						icon_url: config.guild.iconURL() ?? undefined,

						text: `Strike ${id}${
							displayStrikes ?
								`${footerSeperator}Expiring in 21 ${
									constants.env === "production" ? "day" : "minute"
								}s`
							:	""
						}`,
					},
				},
			],
			components:
				config.channels.tickets?.permissionsFor(user)?.has("ViewChannel") ?
					[
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									style: ButtonStyle.Primary,
									label: "Appeal Strike",
									custom_id: `${id}_confirmStrikeAppeal`,
								},
							],
						},
					]
				:	[],
		})
		.catch(async () => {
			await logMessage.edit(logMessage.content + " (could not send DM)");
			return false as const;
		});

	await giveXp(user, (dm || logMessage).url, XP_PUNISHMENT * strikes);

	strikeDatabase.data = [
		...strikeDatabase.data,
		{ user: user.id, id, date: Date.now(), count: strikes, removed: false },
	];

	const totalStrikeCount = oldStrikeCount + strikes;

	if (Math.trunc(totalStrikeCount) > MUTE_LENGTHS.length * STRIKES_PER_MUTE + 1) {
		await ((
			member?.bannable &&
			!member.roles.premiumSubscriberRole &&
			!member.roles.resolve(config.roles.staff.id) &&
			(constants.env === "production" || member.roles.highest.name === "@everyone")
		) ?
			member.ban({ reason: "Too many strikes" })
		:	log(
				`${LoggingEmojisError} Unable to ban ${user.toString()} (Too many strikes)`,
				LogSeverity.Alert,
				{ pingHere: true },
			));
		return true;
	}

	const totalMuteCount = Math.trunc(totalStrikeCount / STRIKES_PER_MUTE);
	const totalMuteLength = MUTE_LENGTHS.reduce(
		(accumulator, length, index) =>
			index < totalMuteCount ? accumulator + length : accumulator,
		0,
	);
	const addedMuteLength = totalMuteLength - oldMuteLength;

	if (addedMuteLength) {
		await (member?.moderatable ?
			member.disableCommunicationUntil(
				addedMuteLength * (constants.env === "production" ? 3_600_000 : 60_000) +
					Date.now(),
				"Too many strikes",
			)
		:	log(
				`${LoggingEmojisError} Unable to mute ${user.toString()} for ${addedMuteLength} ${
					constants.env === "production" ? "hour" : "minute"
				}${addedMuteLength === 1 ? "" : "s"}`,
				LogSeverity.Alert,
				{ pingHere: true },
			));
	}

	if (Math.trunc(totalStrikeCount) > MUTE_LENGTHS.length * STRIKES_PER_MUTE) {
		await user
			.send(
				`## This is your last chance. If you get another strike before ${time(
					new Date((allUserStrikes[0]?.date ?? Date.now()) + EXPIRY_LENGTH),
					TimestampStyles.LongDate,
				)}, you may be banned.`,
			)
			.catch(() => void 0);
	}

	return dm ? true : "no-dm";
}
export async function removeStrike(
	interaction: ButtonInteraction,
	id: string,
): Promise<InteractionResponse | undefined> {
	const strike = id && (await filterToStrike(id));
	if (!strike) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Invalid strike ID!`,
		});
	}

	if (strike.removed) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} That strike was already removed!`,
		});
	}

	strikeDatabase.data = strikeDatabase.data.map((toRemove) =>
		// Double equals because RoboTop warns are stored as numbers in the database
		id == toRemove.id ? { ...toRemove, removed: true } : toRemove,
	);
	const member = await config.guild.members.fetch(strike.user).catch(() => void 0);
	const user =
		member?.user ??
		(await client.users.fetch(strike.user).catch(() => userMention(strike.user)));
	const { url: logUrl } = await interaction.reply({
		fetchReply: true,
		content: `${constants.emojis.statuses.yes} Removed ${user.toString()}’s strike \`${id}\`!`,
	});
	if (
		member?.moderatable &&
		member.communicationDisabledUntil &&
		Number(member.communicationDisabledUntil) > Date.now()
	)
		await member.disableCommunicationUntil(Date.now(), "Strike removed");
	await log(
		`${
			LoggingEmojis.Punishment
		} Strike \`${id}\` removed from ${user.toString()} by ${interaction.user.toString()}`,
		LogSeverity.ImportantUpdate,
	);
	if (user instanceof User) await giveXp(user, logUrl, XP_PUNISHMENT * strike.count * -1);
}
export async function addStrikeBack(
	interaction: ButtonInteraction,
	id: string,
): Promise<InteractionResponse | undefined> {
	const strike = id && (await filterToStrike(id));
	if (!strike) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Invalid strike ID!`,
		});
	}

	if (!strike.removed) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} That strike was not removed!`,
		});
	}

	strikeDatabase.data = strikeDatabase.data.map((toRemove) =>
		id === toRemove.id ? { ...toRemove, removed: false } : toRemove,
	);
	const user = await client.users.fetch(strike.user).catch(() => userMention(strike.user));
	const { url: logUrl } = await interaction.reply({
		fetchReply: true,
		content: `${
			constants.emojis.statuses.yes
		} Added ${user.toString()}’s strike \`${id}\` back!`,
	});
	await log(
		`${
			LoggingEmojis.Punishment
		} Strike \`${id}\` was added back to ${user.toString()} by ${interaction.user.toString()}`,
		LogSeverity.ImportantUpdate,
	);
	if (user instanceof User) await giveXp(user, logUrl, XP_PUNISHMENT * strike.count);
}
