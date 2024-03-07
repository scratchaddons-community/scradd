import { stripMarkdown } from "../../../util/markdown.js";
import type { CustomOperation } from "../util.js";
import { ApplicationCommandOptionType } from "discord.js";

const replacements: Record<string, string> = {
	small: "smol",
	cute: "kawaii",
	fluff: "floof",
	love: "luv",
	stupid: "baka",
	fool: "baka",
	idiot: "baka",
	what: "nani",
	meow: "nya",
	no: "nu",
	you: "yu",
};
const endings = [
	"( ͡o ω ͡o )",
	"(///ˬ///✿)",
	"(U ᵕ U❁)",
	"(U ﹏ U)",
	"(ˆ ﻌ ˆ)♡",
	"(˘ω˘)",
	"(⑅˘꒳˘)",
	"(✿oωo)",
	"(ꈍᴗꈍ)",
	"*blushes*",
	"-.-",
	"/(^•ω•^)",
	":3",
	":3",
	":3",
	"<:_:898310317833076847>",
	">_<",
	">w<",
	"OwO",
	"UwU",
	"XD",
	"^^",
	"^^;;",
	"^•ﻌ•^",
	"mya",
	"nya!",
	"nyaa~~",
	"o.O",
	"owo",
	"rawr",
	"rawr x3",
	"uwu",
	"òωó",
	"ʘwʘ",
	"σωσ",
	"♡",
	"😳",
	"😳😳😳",
	"🥺",
	"🥺 👉👈",
] as const;

export function uwuify(text: string): string {
	const output = stripMarkdown(text)
		.split(/\s+/)
		.map((word) =>
			/^(?:https?:\/\/|(?:(.)\1*|<.+>)$)/.test(word)
				? word
				: replacements[word.toLowerCase()] ?? convertWord(word),
		);

	output.push(endings[Math.floor(Math.random() * endings.length)] ?? endings[0]);
	return output.join(" ");
}
function convertWord(word: string): string {
	const uwuify = word
		.toLowerCase()
		.replaceAll(/[\p{Pi}\p{Pf}＂＇'"`՚’]/gu, "")
		.replaceAll(/[lr]/g, "w")
		.replaceAll(/n(?=[aeo])/g, "ny")
		.replaceAll(/(?<![aeiouy])y+\b/g, ({ length }) => "i".repeat(length));
	return uwuify[0] && Math.random() > 0.8 ? `${uwuify[0]}-${uwuify}` : uwuify;
}

const data: CustomOperation = {
	name: "uwu",
	description: uwuify("Uwuify provided text"),
	censored: "channel",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "text",
			description: uwuify("The text to uwuify"),
			required: true,
		},
	],
	async command(interaction, { text }) {
		await interaction.reply(uwuify(typeof text === "string" ? text : ""));
	},
};
export default data;
