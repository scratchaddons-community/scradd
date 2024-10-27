import type { BaseMessageOptions, GuildMember, Message, Snowflake, User } from "discord.js";

import { ButtonStyle, ComponentType, MessageType, time, TimestampStyles } from "discord.js";
import { getFilesFromMessage, GlobalUsersPattern, paginate } from "strife.js";

import constants from "../../common/constants.js";
import Database, { allDatabaseMessages } from "../../common/database.js";
import { convertBase } from "../../util/numbers.js";
import { asyncFilter, gracefulFetch } from "../../util/promises.js";
import { getLoggingThread } from "../logging/misc.js";
import { LogSeverity } from "../logging/util.js";
import { EXPIRY_LENGTH } from "./misc.js";

export const strikeDatabase = new Database<{
	user: Snowflake;
	date: number;
	id: number | string;
	count: number;
	removed: boolean;
}>("strikes");
await strikeDatabase.init();

const { value: robotopStrikes = [] } = await asyncFilter(allDatabaseMessages, async (message) => {
	const files = await getFilesFromMessage(message);
	const file = files.find(({ name }) => name === "robotop_warns.json");
	const strikes =
		file && (await gracefulFetch<{ id: number; mod: Snowflake; reason: string }[]>(file.url));
	return strikes ?? false;
}).next();

const strikesCache: Record<string, { mod?: string; reason?: string }> = {};

export default async function filterToStrike(
	filter: string,
): Promise<((typeof strikeDatabase)["data"][number] & (typeof strikesCache)[string]) | undefined> {
	if (/^\d{1,4}$/.test(filter)) {
		const details = robotopStrikes.find((strike) => strike.id.toString() === filter);
		const strike = strikeDatabase.data.find((strike) => strike.id.toString() === filter);
		if (strike && details) return { ...details, ...strike, id: details.id.toString() };
	}

	const strikeId =
		/^\d{17,20}$/.test(filter) ? convertBase(filter, 10, convertBase.MAX_BASE) : filter;
	const strike = strikeDatabase.data.find((strike) => strike.id.toString() === strikeId);
	if (!strike) return;
	if (strikesCache[strikeId]) return { ...strike, ...strikesCache[strikeId] };

	const channel = await getLoggingThread(
		LogSeverity[filter.startsWith("0") ? "Alert" : "ImportantUpdate"],
	);
	const message = await channel.messages
		.fetch(convertBase(strikeId, convertBase.MAX_BASE, 10))
		.catch(() => void 0);
	if (!message) return;

	if (
		strikeId.startsWith("0") &&
		message.type === MessageType.AutoModerationAction &&
		message.embeds[0]
	) {
		const reason = message.embeds[0].fields.find((field) => field.name === "rule_name")?.value;
		const context = message.embeds[0].description;
		const data = {
			mod: "AutoMod",
			reason: (reason ? `${reason}\n` : "") + (context ? `>>> ${context}` : ""),
		};
		strikesCache[strikeId] = data;
		return { ...strike, ...data };
	}

	const { url } = message.attachments.first() ?? {};
	const data = {
		mod: [...message.content.matchAll(GlobalUsersPattern)][1]?.groups?.id,

		reason:
			url ?
				await fetch(url).then(async (response) => await response.text())
			:	(/```.*\n([^]+)\n```/.exec(message.content)?.[1] ?? message.content),
	};
	strikesCache[strikeId] = data;
	return { ...strike, ...data };
}

export async function listStrikes(
	member: GuildMember | User,
	reply: (options: BaseMessageOptions) => Promise<Message>,
	{ expired: showExpired = true, removed: showRemoved = false } = {},
	commandUser: User | false = false,
): Promise<void> {
	const strikes = strikeDatabase.data
		.filter(
			(strike) =>
				strike.user === member.id &&
				(showRemoved || !strike.removed) &&
				(showExpired || strike.date + EXPIRY_LENGTH > Date.now()),
		)
		.toSorted((one, two) => two.date - one.date);

	const totalStrikeCount = Math.trunc(
		strikes.reduce(
			(accumulator, { count, removed }) => count * Number(!removed) + accumulator,
			0,
		),
	);

	await paginate(
		strikes,
		(strike) => {
			const count = Math.floor(strike.count);
			return `${
				strike.removed ? "~~"
				: strike.date + EXPIRY_LENGTH > Date.now() ? ""
				: "*"
			}\`${strike.id}\`${
				count === 1 ? "" : ` (${count < 1 ? "verbal" : `\\*${count}`})`
			} - ${time(new Date(strike.date), TimestampStyles.RelativeTime)}${
				strike.removed ? "~~"
				: strike.date + EXPIRY_LENGTH > Date.now() ? ""
				: "*"
			}`;
		},
		reply,
		{
			title: `${member.displayName}’s strikes`,
			singular: "strike",

			user: commandUser,
			totalCount: totalStrikeCount,

			timeout: constants.collectorTime,
			format: member,

			generateComponents(filtered) {
				if (filtered.length > 5) {
					return [
						{
							type: ComponentType.StringSelect,
							customId: "_selectStrike",
							placeholder: "View more information on a strike",

							options: filtered.map((strike) => ({
								label: strike.id.toString(),
								value: strike.id.toString(),
							})),
						},
					];
				}
				return filtered.map((strike) => ({
					label: strike.id.toString(),
					style: ButtonStyle.Secondary,
					customId: `${strike.id}_strike`,
					type: ComponentType.Button,
				}));
			},
		},
	);
}
