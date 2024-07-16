import addons from "@sa-community/addons-data" assert { type: "json" };

const domains = {
	npm: "https://npmjs.com/package",
	scradd:
		process.env.NODE_ENV === "production" || !process.env.PORT ?
			"https://sa-discord.up.railway.app"
		:	(`http://localhost:${process.env.PORT}` as const),
	scratch: "https://scratch.mit.edu",
	scratchAddons: "https://scratchaddons.com",
	scratchApi: "https://corsproxy.io/?https://api.scratch.mit.edu",
	scratchdb: "https://scratchdb.lefty.one/v3",
} as const;

export default {
	addonSearchOptions: {
		keys: [
			({ addonId }: (typeof addons)[number]) => addonId.replaceAll("-", " "),
			"addonId",
			"manifest.name",
			"manifest.description",
			"manifest.settings.*.name",
			"manifest.credits.*.name",
			"manifest.presets.*.name",
			"manifest.presets.*.description",
		],
	},

	collectorTime: 45_000,
	defaultPunishment: "No reason given.",
	domains,

	emojis: {
		message: {
			add: "<:__:938441019278635038>",
			boost: "<:__:938441038756986931>",
			call: "<:__:1202779913975894058>",
			edit: "<:__:938441054716297277>",
			error: "<:__:949439327413358602>",
			fail: "<:__:1048464674892558396>",
			live: "<:__:1202777724519845918>",
			pin: "<:__:1202777778345218048>",
			raisedHand: "<:__:1202777719461646406>",
			remove: "<:__:947707131879104554>",
			reply: "<:__:1202777780077469708>",
			speaker: "<:__:1202777720971464704>",
			stage: "<:__:1202777723001380936>",
			subscription: "<:__:1202777717439987722>",
			success: "<:__:1048464639056420885>",
			thread: "<:__:1202777726478450730>",
			warning: "<:__:1048466347039928370>",
		},

		misc: {
			addon: "<:__:817273401869205524>",
			blue: "<:__:1117217909857587210>",
			coinflip: "<a:__:1260794434845671554>",
			green: "<:__:1117217865536381030>",
			heads: "<:__:1260790863739752480>",
			loading: "<a:__:949436374174560276>",
		},

		scratch: {
			comments: "<:__:1152834193135521822>",
			favorite: "<:__:899019502417764363>",
			followers: "<:__:1152834505816674375>",
			following: "<:__:899019598807048212>",
			love: "<:__:899019444112740422>",
			projects: "<:__:1152834423784480768>",
			remix: "<:__:899019673436299314>",
			view: "<:__:899019833247690782>",
		},

		statuses: { no: "<:__:1016127863273037935>", yes: "<:__:1016127835217334322>" },

		vc: {
			camera: "<:__:1202777712997961768>",
			deafened: "<:__:1202777714440802354>",
			muted: "<:__:1202777715682574336>",
			streaming: "<:__:1202777711089553508>",
		},

		welcome: {
			ban: "<:__:1041864907194388480>",
			join: "<:__:1041863919708418068>",
			leave: "<:__:1041863867757756477>",
		},
	},

	fonts: "Sora, SoraExt, sans-serif",
	footerSeperator: " • ",
	isTesting: process.argv.some((file) => file.endsWith(".test.js")),

	repos: {
		scradd: "scratchaddons-community/scradd",
		scratchAddons: "ScratchAddons/ScratchAddons",
	},

	scratchColor: 0x88_5c_d4,
	themeColor: process.env.NODE_ENV === "production" ? 0xff_7b_26 : 0x17_5e_f8,

	urls: {
		addonImages: `${domains.scratchAddons}/assets/img/addons`,
		permissions: "https://discordlookup.com/permissions-calculator",
		railway: "https://railway.app?referralCode=RedGuy14",
		settings: `${domains.scratch}/scratch-addons-extension/settings`,
		usercount: `${domains.scratchAddons}/usercount.json`,
	},

	users: {
		disboard: "302050872383242240",
		robotop: "323630372531470346",
		scradd: "929928324959055932",
		weirdo: "691223009515667457",
	},

	webhookName: "scradd-webhook",
	zws: "\u200B",
} as const;
