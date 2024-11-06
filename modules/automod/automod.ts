import type { Message } from "discord.js";

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
	const baseChannel = getBaseChannel(message.channel);

	let needsDelete = false;
	const deletionMessages: string[] = [];

	const animatedEmojis =
		baseChannel?.id !== config.channels.bots?.id && message.content.match(GlobalAnimatedEmoji);
	const badAnimatedEmojis =
		animatedEmojis &&
		animatedEmojis.length > 15 &&
		Math.floor((animatedEmojis.length - 16) / 10) * PARTIAL_STRIKE_COUNT;
	if (animatedEmojis && typeof badAnimatedEmojis === "number") {
		await warn(
			message.author,
			`${animatedEmojis.length} animated emojis`,
			badAnimatedEmojis,
			animatedEmojis.join(""),
		);
		needsDelete = true;
		deletionMessages.push("Please don’t post that many animated emojis!");
	}

	const invitePromises = message.content
		.match(InvitesPattern)
		?.map(
			async (link) =>
				[
					link,
					await client.fetchInvite(link.split("/").at(-1) ?? link).catch(() => void 0),
				] as const,
		);
	const invites = await Promise.all(invitePromises ?? []);

	if (
		config.channels.share &&
		baseChannel &&
		config.channels.share.id !== baseChannel.id &&
		!baseChannel.isDMBased() &&
		baseChannel.permissionsFor(baseChannel.guild.id)?.has("SendMessages")
	) {
		const badInvites = [
			...new Set(
				invites
					.filter(
						([, invite]) =>
							invite &&
							invite.type === InviteType.Guild &&
							!WHITELISTED_INVITE_GUILDS.has(invite.guild?.id),
					)
					.map(([link]) => link),
			),
		];

		if (badInvites.length) {
			await warn(
				message.author,
				`Server invite in ${message.channel.toString()}`,
				badInvites.length,
				badInvites.join("\n"),
			);
			needsDelete = true;
			deletionMessages.push(
				`Please keep server invites in ${config.channels.share.toString()}!`,
			);
		}

		const bots = [...new Set(message.content.match(GlobalBotInvitesPattern))];
		if (!message.author.bot && bots.length) {
			await warn(
				message.author,
				`Bot invite in ${message.channel.toString()}`,
				bots.length,
				bots.join("\n"),
			);
			needsDelete = true;
			deletionMessages.push(
				`Please don’t post bot invites outside of ${config.channels.share.toString()}!`,
			);
		}

		if (
			![
				config.roles.dev?.id,
				config.roles.epic?.id,
				config.roles.booster?.id,
				config.roles.established?.id,
			].some((role) => !message.member || (role && message.member.roles.resolve(role)))
		) {
			const level = getLevelForXp(
				xpDatabase.data.find(({ user }) => user === message.author.id)?.xp ?? 0,
			);
			const adsAllowed =
				!baseChannel.name.includes("general") && !baseChannel.name.includes("chat");

			const links = Array.from(
				new Set(message.content.match(/(https?:\/\/[\w.:@]+(?=[^\w.:@]|$))/gis) ?? []),
				(link) => new URL(link),
			);

			const { shorteners, ads } = links.reduce<{ shorteners: URL[]; ads: URL[] }>(
				({ shorteners, ads }, link) => {
					if (
						SHORTENER_DOMAINS.includes(link.hostname) ||
						SHORTENER_DOMAINS.some((domain) => link.hostname.endsWith(`.${domain}`))
					)
						shorteners.push(link);
					if (
						!adsAllowed &&
						(AD_DOMAINS.includes(link.hostname) ||
							AD_DOMAINS.some((domain) => link.hostname.endsWith(`.${domain}`)))
					)
						ads.push(link);
					return { shorteners, ads };
				},
				{ shorteners: [], ads: [] },
			);

			if (shorteners.length) {
				await warn(
					message.author,
					`Used ${
						shorteners.length === 1 ? "a link shortener" : "link shorteners"
					} in ${message.channel.toString()} while at level ${level}`,
					shorteners.length * PARTIAL_STRIKE_COUNT,
					shorteners.join(" "),
				);
				needsDelete = true;
				deletionMessages.push(
					"For moderation purposes, please do not use link shorteners.",
				);
			}
			if (ads.length) {
				await warn(
					message.author,
					`Posted blacklisted link${
						ads.length === 1 ? "" : "s"
					} in ${message.channel.toString()} while at level ${level}`,
					ads.length * PARTIAL_STRIKE_COUNT,
					ads.join(" "),
				);
				needsDelete = true;
				deletionMessages.push(
					`Sorry, but you need level ${ESTABLISHED_THRESHOLD} to post ${
						ads.length === 1 ? "that link" : "those links"
					} outside a channel like ${config.channels.share.toString()}!`,
				);
			}
		}
	}

	const badWords = [
		tryCensor(stripMarkdown(message.content)),
		...message.stickers.map(({ name }) => tryCensor(name)),
		...invites.map(([, invite]) => !!invite?.guild && tryCensor(invite.guild.name)),
	].reduce(
		(bad, censored) =>
			typeof censored === "boolean" ? bad : (
				{
					strikes: bad.strikes + censored.strikes,
					words: bad.words.map((words, index) => [
						...words,
						...(censored.words[index] ?? []),
					]),
				}
			),
		{ strikes: 0, words: Array.from<string[]>({ length: badWordRegexps.length }).fill([]) },
	);
	if (badWords.strikes) needsDelete = true;

	const badEmbedWords = message.embeds
		.flatMap((embed) => [
			embed.description,
			embed.title,
			embed.footer?.text,
			embed.author?.name,
			...embed.fields.flatMap((field) => [field.name, field.value]),
		])
		.reduce(
			(bad, current) => {
				const censored = tryCensor(current || "", 1);
				return censored ?
						{
							strikes: bad.strikes + censored.strikes,
							words: bad.words.map((words, index) => [
								...words,
								...(censored.words[index] ?? []),
							]),
						}
					:	bad;
			},
			{ strikes: 0, words: Array.from<string[]>({ length: badWordRegexps.length }).fill([]) },
		);
	if (badEmbedWords.strikes && message.system) needsDelete = true;

	const languageStrikes = badWords.strikes + badEmbedWords.strikes;
	if (languageStrikes) {
		const words = [...badWords.words.flat(), ...badEmbedWords.words.flat()];
		await warn(
			message.interactionMetadata?.user ?? message.author,
			words.length === 1 ? "Used a banned word" : "Used banned words",
			languageStrikes,
			words.join(", "),
		);
		deletionMessages.push(
			languageStrikes < 1 ? "Please don’t say that here!" : "Please watch your language!",
		);
	}

	if (needsDelete) return !(await deleteMessage());
	if (badEmbedWords.strikes) {
		await deleteMessage();
		await message.suppressEmbeds();
	}

	return true;

	async function deleteMessage(): Promise<boolean> {
		const mentions = message.mentions.users.filter(
			(user) =>
				!user.bot &&
				user.id !== message.author.id &&
				user.id !== message.interactionMetadata?.user.id,
		);
		if (mentions.size && needsDelete && message.deletable)
			deletionMessages.push(
				`(ghost pinged ${joinWithAnd(mentions.map((user) => user.toString()))})`,
			);

		async function sendPublicWarn(): Promise<Message | undefined> {
			if (!message.system)
				return await message.reply({
					content: `${constants.emojis.statuses.no} ${deletionMessages.join("\n")}`,
					allowedMentions: { users: [], repliedUser: true },
				});

			if (!message.channel.isSendable()) return;
			return await message.channel.send({
				content: `${constants.emojis.statuses.no} ${(
					message.interactionMetadata?.user ?? message.author
				).toString()}, ${deletionMessages[0]?.toLowerCase() ?? ""}${[
					"",
					...deletionMessages.slice(1),
				].join("\n")}`,
				allowedMentions: {
					users: [(message.interactionMetadata?.user ?? message.author).id],
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
