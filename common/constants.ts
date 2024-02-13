import addons from "@sa-community/addons-data" assert { type: "json" };

export default {
	addonSearchOptions: {
		keys: [
			({ addonId }: typeof addons[number]) => addonId.replaceAll("-", " "),
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

	emojis: {
		discord: {
			add: "<:_:938441019278635038>",
			boost: "<:_:938441038756986931>",
			call: "<:_:1202779913975894058>",
			camera: "<:_:1202777712997961768>",
			deafened: "<:_:1202777714440802354>",
			edit: "<:_:938441054716297277>",
			error: "<:_:949439327413358602>",
			fail: "<:_:1048464674892558396>",
			live: "<:_:1202777724519845918>",
			muted: "<:_:1202777715682574336>",
			pin: "<:_:1202777778345218048>",
			raisedHand: "<:_:1202777719461646406>",
			remove: "<:_:947707131879104554>",
			reply: "<:_:1202777780077469708>",
			speaker: "<:_:1202777720971464704>",
			stage: "<:_:1202777723001380936>",
			streaming: "<:_:1202777711089553508>",
			subscription: "<:_:1202777717439987722>",
			success: "<:_:1048464639056420885>",
			thread: "<:_:1202777726478450730>",
			typing: "<a:_:949436374174560276>",
			warning: "<:_:1048466347039928370>",
		},

		misc: {
			addon: "<:_:817273401869205524>",
			blue: "<:_:1117217909857587210>",
			green: "<:_:1117217865536381030>",
		},

		scratch: {
			comments: "<:_:1152834193135521822>",
			favorite: "<:_:899019502417764363>",
			followers: "<:_:1152834505816674375>",
			following: "<:_:899019598807048212>",
			love: "<:_:899019444112740422>",
			projects: "<:_:1152834423784480768>",
			remix: "<:_:899019502417764363>",
			view: "<:_:899019673436299314>",
		},

		statuses: { no: "<:_:1016127863273037935>", yes: "<:_:1016127835217334322>" },

		welcome: {
			ban: "<:_:1041864907194388480>",
			join: "<:_:1041863919708418068>",
			leave: "<:_:1041863867757756477>",
		},
	},

	fonts: "Sora, SoraExt, sans-serif",
	footerSeperator: " • ",
	scratchColor: 0x88_5c_d4,
	themeColor: process.env.NODE_ENV === "production" ? 0xff_7b_26 : 0x17_5e_f8,

	urls: {
		addonImageRoot: "https://scratchaddons.com/assets/img/addons",
		saRepo: "ScratchAddons/ScratchAddons",
		scratch: "https://scratch.mit.edu",
		scratchApi: "https://api.scratch.mit.edu",
		scratchdb: "https://scratchdb.lefty.one/v3",
		settingsPage: "https://scratch.mit.edu/scratch-addons-extension/settings",
		usercountJson: "https://scratchaddons.com/usercount.json",
	},

	users: {
		disboard: "302050872383242240",
		hans: "279855717203050496",
		robotop: "323630372531470346",
		scradd: "929928324959055932",
		weirdo: "691223009515667457",
	},

	webhookName: "scradd-webhook",
	zws: "\u200B",
} as const;
