import { client } from "strife.js";

import config from "../common/config.ts";
import constants from "../common/constants.ts";
import { gracefulFetch } from "../util/promises.ts";

const rawJoins = [
	`{{{MEMBER}}}, our **{{{COUNT}}}** member, is here! (they didn’t bring pizza though)`,
	`{{{MEMBER}}}, our **{{{COUNT}}}** member, just spawned in!`,
	`{{{MEMBER}}}, the **{{{COUNT}}}** member, has joined the circus!`,
	`\`when [user v] joins:\` \`say [Hello, \`{{{MEMBER}}}\`!]\` \`set [MEMBER COUNT v] to ({{{RAW_COUNT}}})\`{{{RAW_JOKES}}}`,
	`||Do I always have to let you know when there is a new member?|| {{{MEMBER}}} is here (our **{{{COUNT}}}**)!`,
	`A big shoutout to {{{MEMBER}}}, we’re glad you’ve joined us as our **{{{COUNT}}}** member!`,
	`A wild {{{MEMBER}}} appeared (our **{{{COUNT}}}** member)`,
	`Act professional, {{{MEMBER}}} is here, our **{{{COUNT}}}** member!`,
	`Everybody please welcome {{{MEMBER}}} to the server; they’re our **{{{COUNT}}}** member!`,
	`Here we go again… {{{MEMBER}}} is here, our **{{{COUNT}}}** member!`,
	`Is it a bird? Is it a plane? No, it’s {{{MEMBER}}}, our **{{{COUNT}}}** member!`,
	`Places, everyone! {{{MEMBER}}}, our **{{{COUNT}}}** member, is here!`,
	`Rest here weary traveler, {{{MEMBER}}}. You’re the **{{{COUNT}}}** member.`,
	`Watch out! {{{MEMBER}}} is here! They’re our **{{{COUNT}}}**!`,
	`Welcome:tm: {{{MEMBER}}}! You’re our **{{{COUNT}}}** member!`,
	`You have been warned… Welcome to our **{{{COUNT}}}** member, {{{MEMBER}}}!`,
] as const;
export const joins = [
	...rawJoins,
	...rawJoins,
	...rawJoins,
	`I hope {{{MEMBER}}}, our **{{{COUNT}}}** member, doesn’t give us up or let us down…`,
] as const;

export const bans = [
	`**{{{MEMBER}}}** broke the rules and took an 🇱`,
	`**{{{MEMBER}}}** choked on a watermelon`,
	`**{{{MEMBER}}}** did the no-no.`,
	`**{{{MEMBER}}}** failed the staff’s ${constants.env === "testing" ? 1 : config.roles.helper.members.size}v1`,
	`**{{{MEMBER}}}** got too silly`,
	`**{{{MEMBER}}}** had a skill issue`,
	`**{{{MEMBER}}}** needs a life`,
	"**{{{MEMBER}}}** needed to `Ctrl`+`Shift`+`Alt`+`W`",
	`**{{{MEMBER}}}** took the candy from the mods’ white van`,
	`**{{{MEMBER}}}** was banished to the deep pits of hell.`,
	`**{{{MEMBER}}}** went to the banlands`,
	`*Somebody* sent **{{{MEMBER}}}** to a maximum security federal prison`,
	`Could someone help hide **{{{MEMBER}}}**’s body?`,
	`I don’t think this was the best place for **{{{MEMBER}}}**…`,
	`Oof… **{{{MEMBER}}}** got booted…`,
	`Oop, the hammer met **{{{MEMBER}}}**!`,
	`The mods canceled **{{{MEMBER}}}**`,
	`We don’t talk about what **{{{MEMBER}}}** did…`,
	`Whoops, **{{{MEMBER}}}** angered the mods!`,
] as const;

export const leaves = [
	`**{{{MEMBER}}}** couldn’t handle it here.`,
	"**{{{MEMBER}}}** death.fell.accident.water",
	`**{{{MEMBER}}}** decided enough is enough`,
	`**{{{MEMBER}}}** didn’t want to live in the same world as Blaze`,
	`**{{{MEMBER}}}** fell from a high place`,
	`**{{{MEMBER}}}** got a life!`,
	`**{{{MEMBER}}}** has vanished into the abyss.`,
	`**{{{MEMBER}}}** lost the game.`,
	`**{{{MEMBER}}}** realized their phone wasn’t in their pocket`,
	`**{{{MEMBER}}}** tried to swim in lava`,
	`**{{{MEMBER}}}** turned into a fish and suffocated`,
	`**{{{MEMBER}}}** used quantum bogosort and disintegrated.`,
	`**{{{MEMBER}}}** went to get some milk`,
	`Ahh… **{{{MEMBER}}}** left us… hope they’ll have safe travels!`,
	`And another one’s gone, and another one’s gone, **{{{MEMBER}}}** bit the dust`,
	`Can we get an F in the chat for **{{{MEMBER}}}**? They left!`,
	`Oop, **{{{MEMBER}}}**’s gone… will they ever come back?`,
	`Ope, **{{{MEMBER}}}** got eaten by an evil kumquat and left!`,
	`Raid Shadow Legends sponsored **{{{MEMBER}}}**`,
	`Rip, **{{{MEMBER}}}** left \\:(`,
	`There goes another, bye **{{{MEMBER}}}**!`,
	`Welp… **{{{MEMBER}}}** decided to leave… what a shame…`,
] as const;

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

export const executeMessages = [
	"1️⃣ In Scratch Addons settings, Discord’s “Not Found” site,\nAnd on Scradd’s webpages, away from the light.",
	"2️⃣ A common thread, a thrilling quest,\nFind the hidden code, then you’ve passed the test.",
	"3️⃣ With symbol emojis, react the key,\nIn digital realms, let the secrets free.",
] as const;

const up = ["⏫", "⬆️", "🔼"];
const down = ["⏬", "⬇️", "🔽"];
const left = ["⏪", "⬅️", "◀️"];
const right = ["⏩", "➡️", "▶️"];
export const executeEmojis = [
	up,
	up,
	down,
	down,
	left,
	right,
	left,
	right,
	["🅱️", "🇧"],
	["🅰️", "🇦"],
] as const;
