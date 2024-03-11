import {
	ButtonStyle,
	ComponentType,
	MessageType,
	TimestampStyles,
	time,
	type GuildMember,
	type InteractionReplyOptions,
	type InteractionResponse,
	type Message,
	type Snowflake,
	type User,
} from "discord.js";
import Database, { allDatabaseMessages } from "../../common/database.js";
import { GlobalUsersPattern, paginate } from "../../util/discord.js";
import { convertBase } from "../../util/numbers.js";
import { gracefulFetch } from "../../util/promises.js";
import { LogSeverity, getLoggingThread } from "../logging/misc.js";
import { EXPIRY_LENGTH } from "./misc.js";

export const strikeDatabase = new Database<{
	/** The ID of the user who was warned. */
	user: Snowflake;
	/** The time when this strike was issued. */
	date: number;
	id: number | string;
	count: number;
	removed: boolean;
}>("strikes");
await strikeDatabase.init();

const robotopUrl = allDatabaseMessages
	.find((message) => message.attachments.first()?.name === "robotop_warns.json")
	?.attachments.first()?.url;
const robotopStrikes =
	(robotopUrl &&
		(await gracefulFetch<{ id: number; mod: Snowflake; reason: string }[]>(robotopUrl))) ||
	[];

const strikesCache: Record<string, { mod?: string; reason?: string }> = {};

export default async function filterToStrike(
	filter: string,
): Promise<(typeof strikeDatabase["data"][number] & typeof strikesCache[string]) | undefined> {
	if (/^\d{1,4}$/.test(filter)) {
		const details = robotopStrikes.find((strike) => strike.id.toString() === filter);
		const strike = strikeDatabase.data.find((strike) => strike.id.toString() === filter);
		if (strike && details) return { ...details, ...strike, id: details.id.toString() };
	}

	const strikeId = /^\d{17,20}$/.test(filter)
		? convertBase(filter, 10, convertBase.MAX_BASE)
		: filter;
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

		reason: url
			? await fetch(url).then(async (response) => await response.text())
			: /```.*\n([^]+)\n```$/.exec(message.content)?.[1] ?? message.content,
	};
	strikesCache[strikeId] = data;
	return { ...strike, ...data };
}

export async function listStrikes(
	member: GuildMember | User,
	reply: (options: InteractionReplyOptions) => Promise<InteractionResponse | Message>,
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
		(strike) =>
			`${strike.removed ? "~~" : strike.date + EXPIRY_LENGTH > Date.now() ? "" : "*"}\`${
				strike.id
			}\`${
				strike.count === 1
					? ""
					: ` (${strike.count < 1 ? "verbal" : `\\*${Math.floor(strike.count)}`})`
			} - ${time(new Date(strike.date), TimestampStyles.RelativeTime)}${
				strike.removed ? "~~" : strike.date + EXPIRY_LENGTH > Date.now() ? "" : "*"
			}`,
		reply,
		{
			title: `${member.displayName}’s strikes`,
			format: member,
			singular: "strike",

			user: commandUser,
			totalCount: totalStrikeCount,
			ephemeral: true,

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
