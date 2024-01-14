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
			add: "<:add:1195859865579561052>",
			boost: "<:boost:1195860016427696138>",
			call: "<:call:1195858170309001307>",
			deafened: "<:deafened:1195857887155728424>",
			edit: "<:edit:1195857904100708392> ",
			error: "<:error:1193656283396579418>",
			muted: "<:muted:1195857919057612822>",
			no: "<:no:1193656110696112259>",
			pin: "<:pin:1195858189871226922>",
			raisedHand: "<:raised_hand:1195858087853170790>",
			remove: "<:remove:1195859908978016316>",
			reply: "<:reply:1195858012171161631>",
			speaker: "<:speaker:1195858063211643070>",
			stage: "<:stage:1195860523967840347>",
			stageLive: "<:stage_live:1195860538182336793>",
			streaming: "<:streaming:1195860552908558498>",
			thread: "<:thread:1195858146724433990>",
			typing: "<a:typing:1195857946156994711>",
			warning: "<:warning:1193656265520459806>",
			yes: "<:yes:1193656129750847488>",
		},
		misc: {
			blue: "<:primary:1195858102952665268>",
			green: "<:success:1195857992814448681>",
		},
		scratch: {
			comments: "<:Comments:1101507674442584145>",
			favorite: "<:Star:1101507667857526784>",
			followers: "<:People:1101507672852934837>",
			following: "<:Person:1101507670860632235>",
			love: "<:Heart:1101507665802301560>",
			projects: "<:projects:1101507677894488174>",
			remix: "<:Remix:1101507669489107024>",
			view: "<:View:1101509288221999306>",
		},
		statuses: { no: "<:no:1193656110696112259>", yes: "<:yes:1193656129750847488>" },
		welcome: {
			ban: "<:ban:1193655180630184047>",
			join: "<:join:1193656153666748548>",
			leave: "<:leave:1193656172297855026>",
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
		retron: "765910070222913556",
		robotop: "323630372531470346",
		scradd: "929928324959055932",
	},

	webhookName: "scradd-webhook",
	zws: "\u200B",
} as const;
