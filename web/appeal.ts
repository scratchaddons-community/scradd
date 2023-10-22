import {
	Routes,
	type RESTPostOAuth2AccessTokenResult,
	type RESTGetAPICurrentUserResult,
	type RESTPostOAuth2AccessTokenURLEncodedData,
	type RESTPostOAuth2RefreshTokenURLEncodedData,
	type RESTPostOAuth2RefreshTokenResult,
	ButtonStyle,
	ComponentType,
	GuildBan,
	time,
	roleMention,
	userMention,
} from "discord.js";
import { client } from "strife.js";
import config, { getInitialChannelThreads } from "../common/config.js";
import type { IncomingMessage } from "node:http";
import fileSystem from "node:fs/promises";
import { EXPIRY_LENGTH, strikeDatabase } from "../modules/punishments/misc.js";
import constants from "../common/constants.js";
import giveXp from "../modules/xp/giveXp.js";
import { getAllMessages } from "../util/discord.js";
import { SpecialReminders, remindersDatabase } from "../modules/reminders/misc.js";
import { RoleList, persistedRoles as persistedRoles } from "../modules/roles/persisted.js";
import Mustache from "mustache";
import pkg from "../package.json" assert { type: "json" };

if (!config.channels.mod) throw new ReferenceError("Could not find mod channel");
const thread =
	getInitialChannelThreads(config.channels.mod).find(
		(thread) => thread.name === "Ban Appeal Forms",
	) ||
	(await config.channels.mod.threads.create({
		name: "Ban Appeal Forms",
		reason: "For ban appeal forms",
	}));

const appeals = Object.fromEntries(
	(await getAllMessages(thread))
		.filter((message) => message.author.id === client.user.id && message.embeds.length)
		.map((message) => [
			message.embeds[0]?.description ?? "",
			{
				unbanned:
					message.embeds[1]?.fields.find((field) => field.name == "Decision")?.value ===
					"Unban",
				note: message.embeds[1]?.fields.find((field) => field.name == "Note")?.value,
				date: new Date(message.createdTimestamp + 691_200_000).toDateString(),
			},
		]),
);

const APPEAL_FRAME = await fileSystem.readFile("./web/frame.html", "utf8");
const APPEAL_PAGE = Mustache.render(APPEAL_FRAME, {
		content: await fileSystem.readFile("./web/appeal.html", "utf8"),
	}),
	ANSWER_PAGE = Mustache.render(APPEAL_FRAME, {
		content: await fileSystem.readFile("./web/answer.html", "utf8"),
	});

export default async function showAppeal(request: IncomingMessage) {
	if (!process.env.CLIENT_SECRET) return 503;

	const requestUrl = new URL(
		request.url ?? "",
		`http${"encrypted" in request.socket ? "s" : ""}://${request.headers.host}`,
	);
	const redirectUri = requestUrl.origin + requestUrl.pathname;
	const code = new URLSearchParams(requestUrl.search).get("code");
	if (!code) {
		return [
			303,
			{
				location: `https://discord.com/oauth2/authorize?client_id=${client.user.id}&redirect_uri=${redirectUri}&response_type=code&scope=identify`,
			},
		] as const;
	}

	const tokenData = (await client.rest
		.post(Routes.oauth2TokenExchange(), {
			body: new URLSearchParams({
				client_id: client.user.id,
				client_secret: process.env.CLIENT_SECRET,
				code,
				grant_type: "authorization_code",
				redirect_uri: redirectUri,
			} satisfies RESTPostOAuth2AccessTokenURLEncodedData),
			passThroughBody: true,
			headers: { "content-type": "application/x-www-form-urlencoded" },
			auth: false,
		})
		.catch(() => void 0)) as RESTPostOAuth2AccessTokenResult | undefined;
	if (!tokenData) return 401;
	const user = (await client.rest
		.get(Routes.user(), {
			headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
			auth: false,
		})
		.catch(() => void 0)) as RESTGetAPICurrentUserResult | undefined;
	if (!user) return 401;

	const appeal = appeals[userMention(user.id)];
	if (appeal)
		return Mustache.render(ANSWER_PAGE, {
			username: user.global_name ?? user.username,
			...appeal,
			invite: pkg.homepage,
			id: user.id,
		});
	if (!(await config.guild.bans.fetch(user.id).catch(() => void 0))) return 403;

	return Mustache.render(APPEAL_PAGE, {
		username: user.global_name ?? user.username,
		token: tokenData.refresh_token,
		id: user.id,
	});
}

export async function appeal(request: IncomingMessage) {
	if (!process.env.CLIENT_SECRET) return 503;

	const chunks: Buffer[] = [];
	request.on("data", (chunk: Buffer) => chunks.push(chunk));
	await new Promise((resolve) => request.on("end", resolve));
	const body = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));

	const refreshToken = body.get("token");
	if (!refreshToken) return 401;
	const tokenData = (await client.rest
		.post(Routes.oauth2TokenExchange(), {
			body: new URLSearchParams({
				client_id: client.user.id,
				client_secret: process.env.CLIENT_SECRET,
				grant_type: "refresh_token",
				refresh_token: refreshToken,
			} satisfies RESTPostOAuth2RefreshTokenURLEncodedData),
			passThroughBody: true,
			headers: { "content-type": "application/x-www-form-urlencoded" },
			auth: false,
		})
		.catch(() => void 0)) as RESTPostOAuth2RefreshTokenResult | undefined;
	if (!tokenData) return 401;

	const { id } = (await client.rest
		.get(Routes.user(), {
			headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
			auth: false,
		})
		.catch(() => ({}))) as Partial<RESTGetAPICurrentUserResult>;
	if (!id) return 401;
	const { user, reason } = await config.guild.bans.fetch(id).catch((): Partial<GuildBan> => ({}));
	if (!user) return 403;

	const strikes = strikeDatabase.data.filter((strike) => strike.user === user.id);
	const totalStrikeCount = strikes.reduce(
		(accumulator, { count, removed }) => count * Number(!removed) + accumulator,
		0,
	);
	const recentStrikeCount = strikes
		.filter((strike) => strike.date + EXPIRY_LENGTH > Date.now())
		.reduce((accumulator, { count, removed }) => count * Number(!removed) + accumulator, 0);
	const semiRecentStrikeCount = strikes
		.filter((strike) => strike.date + EXPIRY_LENGTH * 2 > Date.now())
		.reduce((accumulator, { count, removed }) => count * Number(!removed) + accumulator, 0);
	const persistant = await RoleList.findOne({ id: user.id });
	const unbanTime = remindersDatabase.data.find(
		(reminder) =>
			reminder.user === client.user.id &&
			reminder.id === SpecialReminders.Unban &&
			reminder.reminder === user.id,
	)?.date;

	const mention = user.toString();
	const fields = {
		ban: body.get("ban")?.trim(),
		unban: body.get("unban")?.trim(),
		misc: body.get("misc")?.trim(),
	};
	if (!fields.ban || !fields.unban) return 400;

	const message = await thread.send({
		embeds: [
			{
				author: { name: user.tag, icon_url: user.displayAvatarURL() },
				description: mention,
				fields: [
					{
						name: "Persisted Roles",
						value:
							Object.entries(persistedRoles)
								.map(([name, ids]) => persistant?.[name] && [ids].flat()[0])
								.filter((role): role is string => !!role)
								.toSorted((one, two) =>
									config.guild.roles.comparePositions(one, two),
								)
								.map(roleMention)
								.join(" ") || "*No roles*",
						inline: false,
					},
					{ name: "Created Account", value: time(user.createdAt), inline: true },
					{
						name: "Auto Unban",
						value: unbanTime ? time(new Date(unbanTime)) : "Never",
						inline: true,
					},
					{
						name: "Strikes",
						value: `${totalStrikeCount.toLocaleString(
							"en-us",
						)} (${recentStrikeCount.toLocaleString(
							"en-us",
						)} in the past 3 weeks; ${semiRecentStrikeCount.toLocaleString(
							"en-us",
						)} in the past 6 weeks)`,
						inline: true,
					},
					{ name: constants.zws, value: constants.zws, inline: false },
					{
						name: "Mod’s Perspective",
						value: reason ?? constants.defaultPunishment,
						inline: !fields.misc,
					},
					{ name: "User’s Perspective", value: fields.ban, inline: true },
					{ name: "Appeal", value: fields.unban, inline: true },
					...(fields.misc ? [{ name: "Misc", value: fields.misc, inline: true }] : []),
				],
			},
		],

		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						style: ButtonStyle.Success,
						type: ComponentType.Button,
						customId: `${user.id}_unbanVote`,
						label: "Accept (0/2)",
					},
					{
						style: ButtonStyle.Danger,
						type: ComponentType.Button,
						customId: `${user.id}_noUnban`,
						label: "Reject",
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						style: ButtonStyle.Secondary,
						type: ComponentType.Button,
						customId: `${user.id}_userInfo`,
						label: "User Info",
					},
					{
						style: ButtonStyle.Secondary,
						type: ComponentType.Button,
						customId: `${user.id}_xp`,
						label: "XP",
					},
					...(totalStrikeCount
						? [
								{
									style: ButtonStyle.Secondary,
									type: ComponentType.Button,
									customId: `${user.id}_viewStrikes`,
									label: "Strikes",
								} as const,
						  ]
						: []),
				],
			},
		],
	});
	await giveXp(user, message.url);

	const date = new Date(Date.now() + 691_200_000).toDateString();
	appeals[mention] = { date, unbanned: false, note: undefined };

	return Mustache.render(ANSWER_PAGE, { username: user.displayName, date, id: user.id });
}
