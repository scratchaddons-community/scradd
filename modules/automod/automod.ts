import type { Channel, GuildMember, Message, MessageSnapshot } from "discord.js";

import { InviteType } from "discord.js";
import {
	client,
	getBaseChannel,
	GlobalAnimatedEmoji,
	InvitesPattern,
	stripMarkdown,
} from "strife.js";

import config, { getInitialThreads } from "../../common/config.js";
import constants from "../../common/constants.js";
import { getAllMessages, GlobalBotInvitesPattern } from "../../util/discord.js";
import { joinWithAnd } from "../../util/text.js";
import { ignoredDeletions } from "../logging/messages.js";
import log from "../logging/misc.js";
import { LoggingEmojisError, LogSeverity } from "../logging/util.js";
import { PARTIAL_STRIKE_COUNT } from "../punishments/misc.js";
import warn from "../punishments/warn.js";
import { ESTABLISHED_THRESHOLD, getLevelForXp } from "../xp/misc.js";
import { xpDatabase } from "../xp/util.js";
import tryCensor, { badWordRegexps, badWordsAllowed } from "./misc.js";

const threads = config.channels.servers && getInitialThreads(config.channels.servers);
const whitelistedInvites = await Promise.all(
	threads?.map(async (thread) =>
		(await getAllMessages(thread)).flatMap(
			({ content }) =>
				content.match(InvitesPattern)?.map((link) => link.split("/").at(-1) ?? link) ?? [],
		),
	) ?? [],
);
const WHITELISTED_INVITE_GUILDS = new Set([
	config.guild.id,
	...config.otherGuildIds,
	...(await Promise.all(
		whitelistedInvites
			.flat()
			.map(async (link) => (await client.fetchInvite(link).catch(() => void 0))?.guild?.id),
	)),
	undefined, // Invalid links
]);

const AD_DOMAINS = [
	"scratch.mit.edu",
	"turbowarp.org",
	"turbowarp.xyz",

	"youtu.be",
	"youtube.com",
	"youtube-nocookie.com",
];

const SHORTENER_DOMAINS = await fetch(
	"https://raw.githubusercontent.com/timleland/url-shorteners/main/list.txt",
)
	.then((response) => response.text())
	.then((text) => text.split("\n"));

export default async function automodMessage(message: Message): Promise<boolean> {
	if (badWordsAllowed(message.channel)) return true;

	const violations = await findViolations(
		message,
		getBaseChannel(message.channel) ?? message.channel,
		message.member ?? undefined,
	);

	const user = message.interactionMetadata?.user ?? message.author;

	let needsDelete = false;
	const deletionMessages: string[] = [];

	if (violations.animatedEmojis.length > 15) {
		await warn(
			user,
			`${violations.animatedEmojis.length} animated emojis`,
			Math.floor((violations.animatedEmojis.length - 16) / 10) * PARTIAL_STRIKE_COUNT,
			violations.animatedEmojis.join(""),
		);
		needsDelete = true;
		deletionMessages.push("Please don’t post that many animated emojis!");
	}

	if (violations.invites.size) {
		await warn(
			user,
			`Server invite${violations.invites.size === 1 ? "" : "s"} in ${message.channel.toString()}`,
			violations.invites.size,
			[...violations.invites].join("\n"),
		);
		needsDelete = true;
		deletionMessages.push(
			config.channels.share ?
				`Please keep server invites in ${config.channels.share.toString()}!`
			:	`Please don’t post server invites!`,
		);
	}

	if (violations.bots.size) {
		await warn(
			user,
			`Bot invite${violations.bots.size === 1 ? "" : "s"} in ${message.channel.toString()}`,
			violations.bots.size,
			[...violations.bots].join("\n"),
		);
		needsDelete = true;
		deletionMessages.push(
			`Please don’t post bot invites${
				config.channels.share ? ` outside of ${config.channels.share.toString()}` : ""
			}!`,
		);
	}

	const level = getLevelForXp(xpDatabase.data.find((entry) => entry.user === user.id)?.xp ?? 0);

	if (violations.shorteners.size) {
		await warn(
			user,
			`Link shortener${violations.shorteners.size === 1 ? "" : "s"} while at level ${level}`,
			violations.shorteners.size * PARTIAL_STRIKE_COUNT,
			[...violations.shorteners].join(" "),
		);
		needsDelete = true;
		deletionMessages.push("For moderation purposes, please do not use link shorteners.");
	}

	if (violations.ads.size) {
		await warn(
			user,
			`Blacklisted link${
				violations.ads.size === 1 ? "" : "s"
			} in ${message.channel.toString()} while at level ${level}`,
			violations.ads.size * PARTIAL_STRIKE_COUNT,
			[...violations.ads].join(" "),
		);
		needsDelete = true;
		deletionMessages.push(
			`Sorry, but you need level ${ESTABLISHED_THRESHOLD} to post ${
				violations.ads.size === 1 ? "that link" : "those links"
			}${config.channels.share ? ` outside a channel like ${config.channels.share.toString()}` : ""}!`,
		);
	}

	if (violations.badWords.strikes) needsDelete = true;

	const languageStrikes = violations.badWords.strikes + violations.badEmbedWords.strikes;
	if (languageStrikes) {
		const words = [
			...violations.badWords.words.flat(),
			...violations.badEmbedWords.words.flat(),
		];
		await warn(
			user,
			words.length === 1 ? "Banned word" : "Banned words",
			languageStrikes,
			words.join(", "),
		);
		deletionMessages.push(
			languageStrikes < 1 ? "Please don’t say that here!" : "Please watch your language!",
		);
	}

	if (needsDelete || (violations.badEmbedWords.strikes && message.system))
		return !(await deleteMessage());
	if (violations.badEmbedWords.strikes) {
		await deleteMessage();
		await message.suppressEmbeds();
	}

	return true;

	async function deleteMessage(): Promise<boolean> {
		const mentions = message.mentions.users.filter(
			(mention) => !mention.bot && mention.id !== user.id,
		);
		if (mentions.size && needsDelete && message.deletable)
			deletionMessages.push(
				`(ghost pinged ${joinWithAnd(mentions.map((mention) => mention.toString()))})`,
			);

		async function sendPublicWarn(): Promise<Message | undefined> {
			if (!message.system)
				return await message.reply({
					content: `${constants.emojis.statuses.no} ${deletionMessages.join("\n")}`,
					allowedMentions: { users: [], repliedUser: true },
				});

			if (!message.channel.isSendable()) return;
			return await message.channel.send({
				content: `${constants.emojis.statuses.no} ${user.toString()}, ${
					deletionMessages[0]?.toLowerCase() ?? ""
				}${["", ...deletionMessages.slice(1)].join("\n")}`,
				allowedMentions: {
					users: [user.id],
				},
			});
		}

		const publicWarn = await sendPublicWarn();

		if (needsDelete) {
			await (message.deletable ?
				message.delete()
			:	log(
					`${LoggingEmojisError} Unable to delete ${message.url} (${deletionMessages.join(" ")})`,
					LogSeverity.Alert,
					{ pingHere: true },
				));
		}

		if ((!mentions.size || !needsDelete) && publicWarn) {
			ignoredDeletions.add(publicWarn.id);
			setTimeout(() => publicWarn.delete(), 300_000);
		}

		return needsDelete && message.deletable;
	}
}

async function findViolations(
	message: Message | MessageSnapshot,
	channel: Channel,
	member?: GuildMember,
): Promise<{
	animatedEmojis: string[];
	invites: Set<string>;
	bots: Set<string>;
	shorteners: Set<string>;
	ads: Set<string>;
	badWords: { strikes: number; words: string[][] };
	badEmbedWords: { strikes: number; words: string[][] };
}> {
	const invitePromises = message.content
		.match(InvitesPattern)
		?.map(
			async (link) =>
				[
					link,
					await client.fetchInvite(link.split("/").at(-1) ?? link).catch(() => void 0),
				] as const,
		);
	const allInvites = await Promise.all(invitePromises ?? []);

	const banInvites =
		config.channels.share &&
		config.channels.share.id !== channel.id &&
		!channel.isDMBased() &&
		channel.permissionsFor(channel.guild.id)?.has("SendMessages") &&
		!message.author?.bot;
	const invites = (banInvites ? allInvites : []).filter(
		([, invite]) =>
			invite?.type === InviteType.Guild && !WHITELISTED_INVITE_GUILDS.has(invite.guild?.id),
	);

	const banShorteners =
		!member ||
		![
			config.roles.dev?.id,
			config.roles.epic?.id,
			config.roles.booster?.id,
			config.roles.established?.id,
		].some((role) => role && member.roles.resolve(role));
	const banAds =
		banInvites &&
		banShorteners &&
		(channel.name.includes("general") || channel.name.includes("chat"));
	const links = Array.from(
		banShorteners || banAds ?
			new Set(message.content.match(/(https?:\/\/[\w.:@]+(?=[^\w.:@]|$))/gis))
		:	[],
		(link) => new URL(link),
	);
	const { shorteners, ads } = links.reduce(
		({ shorteners, ads }, link) => {
			if (
				banShorteners &&
				(SHORTENER_DOMAINS.includes(link.hostname) ||
					SHORTENER_DOMAINS.some((domain) => link.hostname.endsWith(`.${domain}`)))
			)
				shorteners.add(link.toString());
			else if (
				banAds &&
				(AD_DOMAINS.includes(link.hostname) ||
					AD_DOMAINS.some((domain) => link.hostname.endsWith(`.${domain}`)))
			)
				ads.add(link.toString());
			return { shorteners, ads };
		},
		{ shorteners: new Set<string>(), ads: new Set<string>() },
	);

	const badWords = getBadWords(
		[
			stripMarkdown(message.content),
			message.poll?.question.text,
			...(message.poll?.answers.map((answer) => [answer.emoji?.name, answer.text]) ?? []),
			...message.attachments.map((attachment) => [
				attachment.title ?? attachment.name,
				attachment.description,
			]),
			...message.stickers.map((sticker) => [sticker.name, sticker.description]),
		].flat(),
	);
	const badEmbedWords = getBadWords(
		[
			...message.embeds.flatMap((embed) => [
				embed.title,
				embed.description,
				embed.author?.name,
				embed.footer?.text,
				embed.url,
				embed.author?.url,
				embed.author?.iconURL,
				embed.thumbnail?.url,
				embed.video?.url,
				embed.image?.url,
				...embed.fields.flatMap((field) => [field.name, field.value]),
			]),
			...allInvites.map(([, invite]) => [
				invite?.guild?.name,
				invite?.channel?.name,
				invite?.guildScheduledEvent?.name,
				invite?.guildScheduledEvent?.description,
				invite?.guildScheduledEvent?.entityMetadata?.location,
				invite?.targetApplication?.name,
				invite?.targetApplication?.description,
			]),
		].flat(),
		1,
	);

	const animatedEmojis =
		channel.id !== config.channels.bots?.id && message.content.match(GlobalAnimatedEmoji);
	const violationData = {
		animatedEmojis: animatedEmojis ? [...animatedEmojis] : [],
		invites: new Set(invites.map(([link]) => link)),
		bots: new Set(banInvites ? message.content.match(GlobalBotInvitesPattern) : []),
		shorteners,
		ads,
		badWords,
		badEmbedWords,
	};

	if (!message.messageSnapshots) return violationData;
	return await message.messageSnapshots.reduce(async (violationsPromise, snapshot) => {
		const violations = await violationsPromise;
		const newViolations = await findViolations(snapshot, channel, member);
		return {
			animatedEmojis: [...violations.animatedEmojis, ...newViolations.animatedEmojis],
			invites: new Set([...violations.invites, ...newViolations.invites]),
			bots: new Set([...violations.bots, ...newViolations.bots]),
			shorteners: new Set([...violations.shorteners, ...newViolations.shorteners]),
			ads: new Set([...violations.ads, ...newViolations.ads]),
			badWords: mergeBadWords([violations.badWords, newViolations.badWords]),
			badEmbedWords: mergeBadWords([violations.badEmbedWords, newViolations.badEmbedWords]),
		};
	}, Promise.resolve(violationData));
}

function getBadWords(
	strings: (string | null | undefined)[],
	shift?: number,
): { strikes: number; words: string[][] } {
	return strings.reduce(
		(bad, current) => {
			const censored = current && tryCensor(current, shift);
			if (!censored) return bad;
			return mergeBadWords([bad, censored]);
		},
		{ strikes: 0, words: Array.from<string[]>({ length: badWordRegexps.length }).fill([]) },
	);
}

function mergeBadWords(badWords: { strikes: number; words: string[][] }[]): {
	strikes: number;
	words: string[][];
} {
	return {
		strikes: badWords.reduce((sum, { strikes }) => sum + strikes, 0),
		words: Array.from({ length: badWordRegexps.length }, (_, index) =>
			badWords.reduce<string[]>((all, { words }) => [...all, ...(words[index] ?? [])], []),
		),
	};
}
