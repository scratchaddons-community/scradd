import type { Message } from "discord.js";
import client from "../../client.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import {
	getBaseChannel,
	GlobalAnimatedEmoji,
	GlobalBotInvitesPattern,
	GlobalInvitesPattern,
} from "../../util/discord.js";
import log, { LoggingEmojis } from "../modlogs/misc.js";
import { PARTIAL_STRIKE_COUNT } from "../punishments/misc.js";
import warn from "../punishments/warn.js";
import censor, { badWordsAllowed } from "./language.js";

export default async function automodMessage(message: Message) {
	const allowBadWords = badWordsAllowed(message.channel);
	const baseChannel = getBaseChannel(message.channel);
	const parentChannel =
		baseChannel && baseChannel.isDMBased() ? baseChannel : baseChannel?.parent;

	const animatedEmojis = message.content.match(GlobalAnimatedEmoji);

	const badAnimatedEmojis =
		animatedEmojis &&
		animatedEmojis.length > 15 &&
		Math.floor((animatedEmojis.length - 16) / 10) * PARTIAL_STRIKE_COUNT;

	if (baseChannel?.id !== CONSTANTS.channels.bots?.id && typeof badAnimatedEmojis === "number") {
		await deleteMessage();
		await warn(
			message.author,
			"Please don’t post that many animated emojis!",
			badAnimatedEmojis,
			animatedEmojis?.map((emoji) => emoji).join(""),
		);
		await message.channel.send(
			`${
				CONSTANTS.emojis.statuses.no
			} ${message.author.toString()}, less animated emojis please!`,
		);
	}

	if (
		!allowBadWords &&
		CONSTANTS.channels.info?.id !== parentChannel?.id &&
		CONSTANTS.channels.advertise &&
		CONSTANTS.channels.advertise.id !== baseChannel?.id &&
		!message.author?.bot
	) {
		const invites = (
			await Promise.all(
				(message.content.match(GlobalInvitesPattern) ?? []).map(async (code) => {
					const invite = await client?.fetchInvite(code).catch(() => {});
					return invite?.guild && invite.guild.id !== message.guild?.id && code;
				}),
			)
		).filter((toWarn): toWarn is string => Boolean(toWarn));

		if (invites.length) {
			await deleteMessage();
			await warn(
				message.author,
				"Please don’t send server invites in that channel!",
				invites.length,
				invites.join("\n"),
			);
			await message.channel.send(
				`${
					CONSTANTS.emojis.statuses.no
				} ${message.author.toString()}, only post invite links in ${CONSTANTS.channels.advertise.toString()}!`,
			);
		}

		const bots = message.content.match(GlobalBotInvitesPattern);
		if (bots?.length) {
			await deleteMessage();
			await warn(
				message.author,
				"Please don’t post bot invite links!",
				bots.length,
				bots.join("\n"),
			);
			await message.channel.send(
				`${
					CONSTANTS.emojis.statuses.no
				} ${message.author.toString()}, bot invites go to ${CONSTANTS.channels.advertise.toString()}!`,
			);
		}
	}

	if (!allowBadWords) {
		const badWords = [
			censor(message.content),
			...message.stickers.map(({ name }) => censor(name)),
		].reduce<undefined | { strikes: number; words: string[][] }>(
			(bad, censored) =>
				typeof censored === "boolean"
					? bad
					: typeof bad === "undefined"
					? censored
					: {
							strikes: bad.strikes + censored.strikes,
							words: bad.words.map((words, index) => [
								...words,
								...(censored.words?.[index] ?? []),
							]),
					  },
			undefined,
		);
		const embedStrikes = message.embeds
			.flatMap((embed) => [
				embed.description,
				embed.title,
				embed.footer?.text,
				embed.author?.name,
				...embed.fields.flatMap((field) => [field.name, field.value]),
			])
			.reduce<undefined | { strikes: number; words: string[][] }>((bad, current) => {
				const censored = censor(current || "");
				return typeof censored === "boolean"
					? bad
					: typeof bad === "undefined"
					? censored
					: {
							strikes: bad.strikes + censored.strikes,
							words: bad.words.map((words, index) => [
								...words,
								...(censored.words?.[index] ?? []),
							]),
					  };
			}, undefined);

		if (badWords) await deleteMessage();
		else if (embedStrikes) await message.suppressEmbeds();

		if (badWords || embedStrikes) {
			await warn(
				message.interaction?.user ?? message.author,
				"Watch your language!",
				(badWords?.words ?? []).reduce(
					(accumulator, current, index) =>
						current.length * Math.max(index, PARTIAL_STRIKE_COUNT) + accumulator,
					0,
				) +
					(embedStrikes?.words ?? []).reduce(
						(accumulator, current, index) =>
							current.length * (index - 1 || PARTIAL_STRIKE_COUNT) + accumulator,
						0,
					),
				`Sent message with words:\n${[
					...(badWords?.words ?? []),
					embedStrikes?.words ?? [],
				].join("\n")}`,
			);
			await message.channel.send(
				`${CONSTANTS.emojis.statuses.no} ${message.author.toString()}, language!`,
			);
		}
	}

	function deleteMessage() {
		if (deleteMessage.deleted) return;

		if (!message.deletable) return log(`${LoggingEmojis.Error} Missing permissions to delete ${message.url}`);

		deleteMessage.deleted = true;
		return message.delete();
	}
	deleteMessage.deleted = false;

	return !deleteMessage.deleted;
}
