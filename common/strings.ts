import { client } from "strife.js";

import constants from "../common/constants.ts";
import { gracefulFetch } from "../util/promises.ts";


const usercount = await gracefulFetch<{ count: number; _chromeCountDate: string }>(
	`${constants.urls.usercount}?date=${Date.now()}`,
);
export const statuses = [
	"🌳 Touching grass",
	"🗿 my honest reaction",
	"🤫🧏‍♂️",
	...(usercount ?
		[
			`${usercount.count.toLocaleString([], {
				compactDisplay: "short",
				maximumFractionDigits: 0,
				notation: "compact",
			})} Scratch Addons users!`,
		]
	:	[]),
	"alan 👑",
	"beep boop beep",
	"Dating Callum",
	"e",
	"Farming dangos",
	constants.env === "testing" ? "Hey!" : `Hey, I’m ${client.user.displayName}!`,
	"Hope for no bugs…",
	`https://github.com/${constants.repos.scradd}`,
	"ims scradd",
	"Loading gobos…",
	"Losing braincells",
	"Moderating Scratch Addons",
	"Report rule-breakers in #contact-mods",
	"Rico, status",
	"SA server shutdown! :(",
	"Scanning potatoes",
	// eslint-disable-next-line unicorn/string-content
	"SCRADD: A discord bot, especially one which the mods can make say something. “This server has 20 Scradd's.”",
	"strawberries 😌",
	"Try /addon!",
	"Watching the SA server!",
	"we do a little trolling",
] as const;

export const uwuReplacements: Record<string, string> = {
	cute: "kawaii",
	fluff: "floof",
	fool: "baka",
	idiot: "baka",
	love: "luv",
	meow: "nya",
	no: "nu",
	small: "smol",
	stupid: "baka",
	what: "nani",
	you: "yu",
};
export const uwuEndings = [
	"-.-",
	":3",
	":3",
	":3",
	"( ͡o ω ͡o )",
	"(///ˬ///✿)",
	"(˘ω˘)",
	"(ˆ ﻌ ˆ)♡",
	"(⑅˘꒳˘)",
	"(✿oωo)",
	"(U ﹏ U)",
	"(U ᵕ U❁)",
	"(ꈍᴗꈍ)",
	"*blushes*",
	"/(^•ω•^)",
	"^•ﻌ•^",
	"^^;;",
	"^^",
	"<:emoji:898310317833076847>",
	">_<",
	">w<",
	"♡",
	"✨",
	"🥺 👉👈",
	"🥺",
	"😳",
	"😳😳😳",
	"daddi",
	"mya",
	"nya!",
	"nyaa~~",
	"o.O",
	"owo",
	"OwO",
	"òωó",
	"rawr x3",
	"rawr",
	"uwu",
	"UwU",
	"XD",
	"ʘwʘ",
	"σωσ",
] as const;
