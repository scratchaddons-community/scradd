import type { Message } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import {
	GlobalAnimatedEmoji,
	GlobalBotInvitesPattern,
	InvitesPattern,
	getAllMessages,
	getBaseChannel,
} from "../../util/discord.js";
import { stripMarkdown } from "../../util/markdown.js";
import { joinWithAnd } from "../../util/text.js";
import log, { LogSeverity, LoggingErrorEmoji } from "../logging/misc.js";
import { PARTIAL_STRIKE_COUNT } from "../punishments/misc.js";
import warn from "../punishments/warn.js";
import { ESTABLISHED_THRESHOLD, getLevelForXp } from "../xp/misc.js";
import { xpDatabase } from "../xp/util.js";
import tryCensor, { badWordRegexps, badWordsAllowed } from "./misc.js";
import { ignoredDeletions } from "../logging/messages.js";

const { threads } = (await config.channels.servers?.threads.fetchActive()) ?? {};
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

const BLACKLISTED_DOMAINS = [
	"scratch.camp",
	"scratch.love",
	"scratch.mit.edu",
	"scratch.org",
	"scratch.pizza",
	"scratch.team",

	"turbowarp.org",
	"turbowarp.xyz",

	"youtu.be",
	"youtube.com",
	"youtube-nocookie.com",

	...(await fetch("https://raw.githubusercontent.com/timleland/url-shorteners/main/list.txt")
		.then((response) => response.text())
		.then((text) => text.split("\n"))),
];

export default async function automodMessage(message: Message): Promise<boolean> {
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

	if (badWordsAllowed(message.channel)) return !(needsDelete && (await deleteMessage()));

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
					.filter(([, invite]) => !WHITELISTED_INVITE_GUILDS.has(invite?.guild?.id))
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

		if (baseChannel.name.includes("general") || baseChannel.name.includes("chat")) {
			const links = Array.from(
				new Set(message.content.match(/(https?:\/\/[\w.:@]+(?=[^\w.:@]|$))/gis) ?? []),
				(link) => new URL(link),
			).filter(
				(link) =>
					BLACKLISTED_DOMAINS.includes(link.hostname) ||
					BLACKLISTED_DOMAINS.some((domain) => link.hostname.endsWith(`.${domain}`)),
			);

			const canPostLinks =
				!links.length ||
				[
					config.roles.dev?.id,
					config.roles.epic?.id,
					config.roles.booster?.id,
					config.roles.established?.id,
				].some((role) => !message.member || (role && message.member.roles.resolve(role)));

			if (!canPostLinks) {
				const level = getLevelForXp(
					xpDatabase.data.find(({ user }) => user === message.author.id)?.xp ?? 0,
				);

				await warn(
					message.author,
					`Posted blacklisted link${
						links.length === 1 ? "" : "s"
					} in ${message.channel.toString()} while at level ${level}`,
					links.length * PARTIAL_STRIKE_COUNT,
					links.join(" "),
				);
				needsDelete = true;
				deletionMessages.push(
					`Sorry, but you need level ${ESTABLISHED_THRESHOLD} to post ${
						links.length === 1 ? "that link" : "those links"
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
			message.interaction?.user ?? message.author,
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
				user.id !== message.interaction?.user.id,
		);
		if (mentions.size && needsDelete && message.deletable)
			deletionMessages.push(
				`(ghost pinged ${joinWithAnd(mentions.map((user) => user.toString()))})`,
			);

		async function sendPublicWarn(): Promise<Message> {
			if (!message.system)
				return await message.reply({
					content: `${constants.emojis.statuses.no} ${deletionMessages.join("\n")}`,
					allowedMentions: { users: [], repliedUser: true },
				});

			return await message.channel.send({
				content: `${constants.emojis.statuses.no} ${(
					message.interaction?.user ?? message.author
				).toString()}, ${deletionMessages[0]?.toLowerCase() ?? ""}${[
					"",
					...deletionMessages.slice(1),
				].join("\n")}`,
				allowedMentions: { users: [(message.interaction?.user ?? message.author).id] },
			});
		}

		const publicWarn = await sendPublicWarn();

		if (needsDelete) {
			await (message.deletable ?
				message.delete()
			:	log(
					`${LoggingErrorEmoji} Unable to delete ${message.url} (${deletionMessages.join(" ")})`,
					LogSeverity.Alert,
				));
		}

		if (!mentions.size || !needsDelete) {
			ignoredDeletions.add(publicWarn.id);
			setTimeout(() => publicWarn.delete(), 300_000);
		}

		return needsDelete && message.deletable;
	}
}
