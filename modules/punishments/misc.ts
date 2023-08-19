import { MessageType, type Snowflake } from "discord.js";
import Database from "../../common/database.js";
import { GlobalUsersPattern } from "../../util/discord.js";
import { convertBase } from "../../util/numbers.js";
import { getLoggingThread } from "../logging/misc.js";

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

const databases = await (await getLoggingThread("databases")).messages.fetch({ limit: 100 });
const { url } =
	databases
		.find((message) => message.attachments.first()?.name === "robotop_warns.json")
		?.attachments.first() ?? {};
const robotopStrikes = url
	? await fetch(url).then(
			async (response) =>
				await response.json<{ id: number; mod: Snowflake; reason: string }[]>(),
	  )
	: [];

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
		.catch(() => {});
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
