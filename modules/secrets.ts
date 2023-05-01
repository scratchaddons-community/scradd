import { MessageType } from "discord.js";

import { getSettings } from "./settings.js";
import { BOARD_EMOJI } from "./potatoboard/board.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { reactAll } from "../util/discord.js";
import { stripMarkdown } from "../util/markdown.js";
import { normalize } from "../util/text.js";

import type Event from "../common/types/event";
import { autoreactions, dad } from "../secrets.js";

const event: Event<"messageCreate"> = async function event(message) {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage) return;
	if (message.channel.isDMBased() || message.guild?.id !== CONSTANTS.guild.id) return;

	const content = stripMarkdown(normalize(message.content.toLowerCase()));

	const REACTION_CAP = 3;
	let reactions = 0;

	if (
		[
			MessageType.GuildBoost,
			MessageType.GuildBoostTier1,
			MessageType.GuildBoostTier2,
			MessageType.GuildBoostTier3,
		].includes(message.type)
	) {
		try {
			await message.react(BOARD_EMOJI);
			reactions++;
		} catch {
			return;
		}
	}

	if (
		message.interaction ||
		CONSTANTS.channels.modlogs?.id === baseChannel?.id ||
		CONSTANTS.channels.info?.id === baseChannel?.parent?.id ||
		!getSettings(message.author).autoreactions
	)
		return;

	if (content.match(/^i['"`‘’“”]?m\b/)) {
		const name = content
			.split(
				/[៚๛๚܌܊፨៕។။၊॥।·｡。᙮᠉᠃።܂܁۔﹒．.‽᥅፧܉؟⁇⁈﹖？?᥄⁉‼﹗！!᛭᛬᛫៖᠅᠄፦፥፤፣፡܈܇܆܅܄܃։﹕：:؛﹔；;;､﹑、᠈᠂،﹐，,\n]+/gm,
			)[0]
			?.split(/\s/g)
			.slice(1)
			.map((word) => (word[0] ?? "").toUpperCase() + word.slice(1).toLowerCase())
			.join(" ");

		if (name) {
			if (CONSTANTS.channels.bots?.id === baseChannel?.id) {
				return await message.reply({
					content: dad(name, message.author),
					allowedMentions: { users: [] },
				});
			}
			reactions++;
			return await message.react("👋").catch(() => {});
		}
	}

	for (const [emoji, ...requirements] of autoreactions) {
		if (typeof emoji == "string" && content.includes(emoji)) continue;

		const results = requirements.map((requirement) => {
			const type = Array.isArray(requirement) ? requirement[1] : "word";
			if (!(["partial", "full", "raw", "plural", "negative", "word"] as const).includes(type))
				throw new TypeError("Unknown type: " + type);

			const pre = type === "partial" || type === "raw" ? "" : type === "full" ? "^" : "\\b";

			const rawMatch = Array.isArray(requirement) ? requirement[0] : requirement;
			const match = typeof rawMatch === "string" ? rawMatch : rawMatch.source;

			const appendage = type === "plural" ? "(?:e?s)?" : "";

			const post = type === "partial" || type === "raw" ? "" : type === "full" ? "$" : "\\b";

			const result = new RegExp(`${pre}${match}${appendage}${post}`, "i").test(
				type === "raw" ? message.content : content,
			);

			return type === "negative" ? result && 0 : result;
		});
		if (results.includes(true) && !results.includes(0)) {
			const emojis = [emoji].flat();
			reactions += emojis.length;
			const messageReactions = await reactAll(message, emojis);
			if (reactions > REACTION_CAP || !messageReactions) return;
		}
	}
};
export default event;
