import { MessageType } from "discord.js";
import { getSettings } from "../settings.js";
import { BOARD_EMOJI } from "../board/misc.js";
import config from "../../common/config.js";
import { getBaseChannel, reactAll } from "../../util/discord.js";
import { stripMarkdown } from "../../util/markdown.js";
import { normalize } from "../../util/text.js";
import { autoreactions, dad } from "./secrets.js";
import { client, defineEvent } from "strife.js";

const REACTION_CAP = 3;

const ignoreTriggers = [
	/\bkill/i,
	/\bsuicid/i,
	/\bdepress/i,
	/\bpain/i,
	/\bsick/i,
	/\babus/i,
	/\bkms/i,
	/\bbleed/i,
];

defineEvent("messageCreate", async (message) => {
	if (
		message.channel.id === message.id ||
		message.channel.isDMBased() ||
		ignoreTriggers.some((trigger) => message.content.match(trigger))
	)
		return;

	const content = stripMarkdown(normalize(message.content.toLowerCase()));
	const cleanContent = stripMarkdown(normalize(message.cleanContent.toLowerCase()));

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
		process.env.NODE_ENV === "production"
			? config.channels.modlogs?.id === baseChannel?.parent?.id
			: config.channels.admin?.id !== baseChannel?.parent?.id
	)
		return;

	const pingsScradd = message.mentions.has(client.user, {
		ignoreEveryone: true,
		ignoreRepliedUser: true,
		ignoreRoles: true,
	});
	if (
		!pingsScradd &&
		(config.channels.info?.id === baseChannel?.id ||
			(message.guild?.id !== config.guild.id && !baseChannel?.name.match(/\bbots\b/i)) ||
			!(await getSettings(message.author)).autoreactions)
	)
		return;

	if (/^i[\p{Pi}\p{Pf}＂＇'"`՚’]?m\b/u.test(cleanContent)) {
		const name = cleanContent
			.split(
				/[\p{Ps}\p{Pe}\p{Pi}\p{Pf}𞥞𞥟𑜽،܀۔؛⁌᭟＂‽՜؟𑜼՝𑿿։꛴⁍፨"⸘‼՞᨟꛵꛳꛶•⸐!꛷𑅀,𖫵:⁃჻⁉𑅃፠⹉᙮𒑲‣⸏！⳺𐡗፣⳾𒑴⹍¡⳻𑂿，⳹𒑳〽᥄⁇𑂾､𛲟𒑱⸑𖺚፧𑽆、።፥𑇈⹓？𑽅꓾.፦𑗅߹;𑈼𖺗．፤𑗄︕¿𑈻⹌｡：𝪋⁈᥅𑅵᠂。；⵰﹗⹔𑻸᠈꓿᠄︖𑊩𑑍𖺘︓?၊𑑚᠃︔⸮။߸᠉⁏﹖𐮙︐︒;꘏𐮚︑𝪈𝪊꥟⸴﹒𝪉§⹁⸼﹕𑇞𝪇܂﹔𑇟﹐܁܆𑗏﹑꘎܇𑗐⸲܅𑗗꘍܄𑗕܉𑗖܃𑗑܈𑗓⁝𑗌⸵𑗍𑗎𑗔𑗋𑗊𑗒⸹؝𑥆𑗉…᠁︙․‥\n]+/gmu,
			)[0]
			?.split(/\s/g)
			.slice(1)
			.map((word) => (word[0] ?? "").toUpperCase() + word.slice(1).toLowerCase())
			.join(" ");

		if (
			name &&
			(pingsScradd ||
				process.env.NODE_ENV !== "production" ||
				message.guild?.id !== config.guild.id ||
				config.channels.bots?.id === baseChannel?.id)
		) {
			return await message.reply({
				content: dad(name, message.author),
				allowedMentions: { users: [] },
			});
		}
	}

	reactionLoop: for (const [emoji, ...requirements] of autoreactions) {
		let doReact = false;
		const emojis = [emoji].flat();
		if (emojis.some((emoji) => content.includes(emoji))) continue;

		for (const requirement of requirements) {
			const [rawMatch, type = "word"] = Array.isArray(requirement)
				? requirement
				: [requirement];
			const match = typeof rawMatch === "string" ? rawMatch : rawMatch.source;

			if (type[1] === "ping") {
				doReact ||= message.mentions.has(match, {
					ignoreEveryone: true,
					ignoreRepliedUser: true,
					ignoreRoles: true,
				});
			} else {
				const result = new RegExp(
					type === "partial" || type === "raw"
						? match
						: `${type === "full" ? "^" : "\\b"}${match}${
								type === "plural" ? "(?:e?s)?" : ""
						  }${type === "full" ? "$" : "\\b"}`,
					"i",
				).test(type === "raw" ? message.content : content);

				if (type === "negative" && result) continue reactionLoop;

				doReact ||= result;
			}
		}

		if (doReact) {
			reactions += emojis.length;
			const messageReactions = await reactAll(message, emojis);
			if (reactions > REACTION_CAP || !messageReactions) return;
		}
	}
});
