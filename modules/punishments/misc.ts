import { MessageType, Snowflake } from "discord.js";
import Database from "../../common/database.js";
import { GlobalUsersPattern } from "../../util/discord.js";
import { convertBase } from "../../util/numbers.js";
import { getLoggingThread } from "../modlogs/logging.js";

export const EXPIRY_LENGTH = 1814400000,
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

export default async function filterToStrike(filter: string) {
	if (/^\d{1,4}$/.test(filter)) {
		const strike = strikeDatabase.data.find((strike) => String(strike.id) === filter);
		const info = robotopStrikes.find((strike) => String(strike.id) === filter);
		if (strike && info) return { ...info, ...strike, id: String(info.id) };
	}
	const channel = await getLoggingThread(filter.startsWith("0") ? undefined : "members");
	const messageId = convertBase(filter, convertBase.MAX_BASE, 10);

	const messageFromId = await channel?.messages.fetch(messageId).catch(() => {});
	const message = messageFromId || (await channel?.messages.fetch(filter).catch(() => {}));
	if (!message) return;

	const strikeId = messageFromId ? filter : convertBase(filter, 10, convertBase.MAX_BASE);
	const strike = strikeDatabase.data.find((strike) => String(strike.id) === strikeId);
	if (!strike) return;

	if (
		strikeId.startsWith("0") &&
		message.type === MessageType.AutoModerationAction &&
		message.embeds[0]
	) {
		return {
			...strike,
			mod: "643945264868098049",

			reason: `${
				message.embeds[0].fields.find((field) => field.name === "rule_name")?.value
			}\n>>> ${message.embeds[0].description}`,
		};
	}

	const { url } = message.attachments.first() || {};
	return {
		...strike,
		mod: [...message.content.matchAll(GlobalUsersPattern)]?.[1]?.groups?.id,

		reason: url
			? await fetch(url).then(async (response) => await response.text())
			: message.content,
	};
}
