import {
	GuildMember,
	MessageType,
	User,
	type Snowflake,
	time,
	TimestampStyles,
	ComponentType,
	ButtonStyle,
	InteractionResponse,
	Message,
	type BaseMessageOptions,
} from "discord.js";
import Database, { DATABASE_THREAD } from "../../common/database.js";
import { GlobalUsersPattern, paginate } from "../../util/discord.js";
import { convertBase } from "../../util/numbers.js";
import { getLoggingThread } from "../logging/misc.js";
import { gracefulFetch } from "../../util/promises.js";

export const EXPIRY_LENGTH = 1_260_000 * (process.env.NODE_ENV === "production" ? 1440 : 1),
	STRIKES_PER_MUTE = 3,
	MUTE_LENGTHS = [8, 16, 36],
	PARTIAL_STRIKE_COUNT = 1 / (STRIKES_PER_MUTE + 1),
	DEFAULT_STRIKES = 1;

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

const databases = await (await getLoggingThread(DATABASE_THREAD)).messages.fetch({ limit: 100 });
const { url } =
	databases
		.find((message) => message.attachments.first()?.name === "robotop_warns.json")
		?.attachments.first() ?? {};
const robotopStrikes =
	(url && (await gracefulFetch<{ id: number; mod: Snowflake; reason: string }[]>(url))) || [];

const strikesCache: Record<string, { mod?: string; reason: string }> = {};

export default async function filterToStrike(filter: string) {
	if (/^\d{1,4}$/.test(filter)) {
		const strike = strikeDatabase.data.find((strike) => strike.id.toString() === filter);
		const info = robotopStrikes.find((strike) => strike.id.toString() === filter);
		if (strike && info) return { ...info, ...strike, id: info.id.toString() };
	}

	const strikeId = /^\d{17,20}$/.test(filter)
		? convertBase(filter, 10, convertBase.MAX_BASE)
		: filter;
	const strike = strikeDatabase.data.find((strike) => strike.id.toString() === strikeId);
	if (!strike) return;
	if (strikesCache[strikeId]) return { ...strike, ...strikesCache[strikeId] };

	const channel = await getLoggingThread(filter.startsWith("0") ? undefined : "members");
	const message = await channel.messages
		.fetch(convertBase(strikeId, convertBase.MAX_BASE, 10))
		.catch(() => void 0);
	if (!message) return;

	if (
		strikeId.startsWith("0") &&
		message.type === MessageType.AutoModerationAction &&
		message.embeds[0]
	) {
		const data = {
			mod: "AutoMod",
			reason: `${
				message.embeds[0].fields.find((field) => field.name === "rule_name")?.value
			}\n>>> ${message.embeds[0].description}`,
		};
		strikesCache[strikeId] = data;
		return { ...strike, ...data };
	}

	const { url } = message.attachments.first() || {};
	const data = {
		mod: [...message.content.matchAll(GlobalUsersPattern)][1]?.groups?.id,

		reason: url
			? await fetch(url).then(async (response) => await response.text())
			: message.content.match(/```.*\n([^]+)\n```$/)?.[1] ?? message.content,
	};
	strikesCache[strikeId] = data;
	return { ...strike, ...data };
}

export async function listStrikes(
	member: GuildMember | User,
	reply: (
		options: BaseMessageOptions & { ephemeral: boolean },
	) => Promise<Message | InteractionResponse>,
	{ expired = true, removed = false } = {},
	commandUser: false | User = false,
) {
	const strikes = strikeDatabase.data
		.filter(
			(strike) =>
				strike.user === member.id &&
				(removed || !strike.removed) &&
				(expired || strike.date + EXPIRY_LENGTH > Date.now()),
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
					: ` (${
							strike.count === PARTIAL_STRIKE_COUNT ? "verbal" : `\\*${strike.count}`
					  })`
			} - ${time(new Date(strike.date), TimestampStyles.RelativeTime)}${
				strike.removed ? "~~" : strike.date + EXPIRY_LENGTH > Date.now() ? "" : "*"
			}`,
		reply,
		{
			title: `${member.displayName}’s strikes`,
			format: member,
			singular: "strike",
			failMessage: `${member.toString()} has never been warned!`,

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
