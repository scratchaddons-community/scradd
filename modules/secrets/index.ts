import { MessageType } from "discord.js";
import { getSettings } from "../settings.js";
import { BOARD_EMOJI } from "../board/misc.js";
import config from "../../common/config.js";
import { getBaseChannel, reactAll } from "../../util/discord.js";
import { stripMarkdown } from "../../util/markdown.js";
import { normalize } from "../../util/text.js";
import { autoreactions, dad } from "./secrets.js";
import { defineEvent } from "strife.js";

const REACTION_CAP = 3;

const ignoreTriggers = [
	/\bkill/,
	/\bsuicid/,
	/\bdepress/,
	/\bpain/,
	/\bsick/,
	/\babus/,
	/\bkms/,
	/\bbleed/,
];

defineEvent("messageCreate", async (message) => {
	if (
		message.guild?.id !== config.guild.id ||
		message.channel.id === message.id ||
		message.channel.isDMBased() ||
		ignoreTriggers.some((trigger) => message.content.match(trigger))
	)
		return;

	const content = stripMarkdown(normalize(message.content.toLowerCase()));

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

	const baseChannel = getBaseChannel(message.channel);
	if (
		config.channels.modlogs?.id === baseChannel?.id ||
		(process.env.NODE_ENV === "production"
			? config.channels.info?.id === baseChannel?.parent?.id
			: config.channels.admin?.id !== baseChannel?.parent?.id) ||
		!getSettings(message.author).autoreactions
	)
		return;

	if (content.match(/^i[\p{Pi}\p{Pf}＂＇'"`՚]?m\b/u)) {
		const name = content
			.split(
				/[\p{Ps}\p{Pe}\p{Pi}\p{Pf}\n𞥞𞥟𑜽،܀۔؛⁌᭟＂‽՜؟𑜼՝𑿿։꛴⁍፨"⸘‼՞᨟꛵꛳꛶•⸐!꛷𑅀,𖫵:⁃჻⁉𑅃፠⹉᙮𒑲‣⸏！⳺𐡗፣⳾𒑴⹍¡⳻𑂿，⳹𒑳〽᥄⁇𑂾､𛲟𒑱⸑𖺚፧𑽆、።፥𑇈⹓？𑽅꓾.፦𑗅߹;𑈼𖺗．፤𑗄︕¿𑈻⹌｡：𝪋⁈᥅𑅵᠂。；⵰﹗⹔𑻸᠈꓿᠄︖𑊩𑑍𖺘︓?၊𑑚᠃︔⸮။߸᠉⁏﹖𐮙︐︒;꘏𐮚︑𝪈𝪊꥟⸴﹒𝪉§⹁⸼﹕𑇞𝪇܂﹔𑇟﹐܁܆𑗏﹑꘎܇𑗐⸲܅𑗗꘍܄𑗕܉𑗖܃𑗑܈𑗓⁝𑗌⸵𑗍𑗎𑗔𑗋𑗊𑗒⸹؝𑥆𑗉…᠁︙․‥\n]+/gmu,
			)[0]
			?.split(/\s/g)
			.slice(1)
			.map((word) => (word[0] ?? "").toUpperCase() + word.slice(1).toLowerCase())
			.join(" ");

		if (name) {
			if (
				process.env.NODE_ENV !== "production" ||
				config.channels.bots?.id === baseChannel?.id
			) {
				return await message.reply({
					content: dad(name, message.author),
					allowedMentions: { users: [] },
				});
			} else if (getSettings(message.author, false).autoreactions !== undefined) {
				reactions++;
				return await message.react("👋").catch(() => {});
			}
		}
	}

	for (const [emoji, ...requirements] of autoreactions) {
		const emojis = [emoji].flat();
		if (emojis.some((emoji) => content.includes(emoji))) continue;

		const results = requirements.map((requirement) => {
			const type = Array.isArray(requirement) ? requirement[1] : "word";

			if (Array.isArray(requirement) && requirement[1] === "ping") {
				return message.mentions.has(requirement[0], {
					ignoreEveryone: true,
					ignoreRepliedUser: true,
					ignoreRoles: true,
				});
			}

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
			reactions += emojis.length;
			const messageReactions = await reactAll(message, emojis);
			if (reactions > REACTION_CAP || !messageReactions) return;
		}
	}
});
