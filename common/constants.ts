import type { Snowflake } from "discord.js";

const env =
	process.argv.some((file) => file.endsWith(".test.js")) ? "testing"
	: process.env.NODE_ENV === "production" ? "production"
	: "development";

export default {
	collectorTime: 45_000,

	channels: { logs: "897639265696112670" },

	emojis: {
		scratch: {
			comments: "<:emoji:1330390013233594540>",
			favorite: "<:emoji:1330390281857531914>",
			followers: "<:emoji:1330390093214646365>",
			love: "<:emoji:1330390388846100562>",
			projects: "<:emoji:1330390567833571421>",
			remix: "<:emoji:1330390655268159609>",
			view: "<:emoji:1330390706115579974>",
		},
		statuses: { no: "<:emoji:1330390765523701890>", yes: "<:emoji:1330390812198047774>" },
	} satisfies Record<string, Record<string, `<${"a" | ""}:emoji:${Snowflake}>`>>,

	env,

	scratchColor: 0x88_5c_d4,
	testingServer: "823941138653773868",
	themeColor: env === "production" ? 0xff_7b_26 : 0x17_5e_f8,

	urls: {
		scradd:
			env === "production" || !process.env.PORT ?
				"https://scradd.up.railway.app"
			:	(`http://localhost:${process.env.PORT}` as const),
		scratchApi: "https://api.scratch.mit.edu",
		/** @deprecated */
		scratchdb: "https://scratchdb.lefty.one/v3",
		addonImages: `https://scratchaddons.com/assets/img/addons`,
		scratch: "https://scratch.mit.edu",
		settings: `https://scratch.mit.edu/scratch-addons-extension/settings`,
	},

	users: { bot: "929928324959055932" },
} as const;
