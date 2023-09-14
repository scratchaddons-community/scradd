export default {
	inviteUrl: "https://discord.gg/FPv957V6SD",
	collectorTime: 45_000,
	zeroWidthSpace: "\u200B",

	emojis: {
		statuses: { yes: "<:yes:1016127835217334322>", no: "<:no:1016127863273037935>" },

		discord: {
			reply: "<:reply:953046345214750720>",
			error: "<:error:949439327413358602>",
			add: "<:add:938441019278635038>",
			remove: "<:remove:947707131879104554>",
			edit: "<:edit:938441054716297277>",
			pin: "<:pin:938441100258070568>",
			boost: "<:boost:938441038756986931>",
			thread: "<:thread:938441090657296444>",
			typing: "<a:typing:949436374174560276>",
			call: "<:call:950438678361161738>",
			yes: "<:yes:1048464639056420885>",
			no: "<:no:1048464674892558396>",
			warning: "<:warning:1048466347039928370>",
			muted: "<:muted:1082818151303106621>",
			deafened: "<:deafened:1082818124463743027>",
			streaming: "<:streaming:1082818172555645028>",
			stage: "<:stage:1083046440714129481>",
			speaker: "<:speaker:1083046535320829952>",
			stageLive: "<:stage_live:1083046549656977423>",
			raisedHand: "<:raised_hand:1083046563049381898>",
		},

		misc: {
			addon: "<:new_addon:817273401869205524>",
			join: "<:join:1041863919708418068>",
			leave: "<:leave:1041863867757756477>",
			ban: "<:ban:1041864907194388480>",
			green: "<:success:1117217865536381030>",
			blue: "<:primary:1117217909857587210>",
		},
	},

	urls: {
		usercountJson: "https://scratchaddons.com/usercount.json",
		saRepo: "ScratchAddons/ScratchAddons",
		addonImageRoot: "https://scratchaddons.com/assets/img/addons",
		settingsPage: "https://scratch.mit.edu/scratch-addons-extension/settings",
		scratchApi: "api.scratch.mit.edu",
	},

	themeColor: process.env.NODE_ENV === "production" ? 0xff_7b_26 : 0x17_5e_f8,
	footerSeperator: " • ",
	webhookName: "scradd-webhook",
	testingServerId: "938438560925761619",

	users: {
		scradd: "929928324959055932",
		hans: "279855717203050496",
		retron: "765910070222913556",
		robotop: "323630372531470346",
		disboard: "302050872383242240",
	},

	canvasEnabled: process.env.CANVAS !== "false",
	fonts: "Sora, SoraExt, sans-serif",
} as const;
