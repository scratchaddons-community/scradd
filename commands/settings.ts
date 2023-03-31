import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
	InteractionReplyOptions,
	Snowflake,
	User,
} from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import Database from "../common/database.js";
import { defineCommand } from "../common/types/command.js";
import { weeklyXpDatabase } from "../common/xp.js";
import { isAprilFools } from "../secrets.js";

export const userSettingsDatabase = new Database<{
	/** The ID of the user. */
	user: Snowflake;
	/** Whether to ping the user when their message gets on the board. */
	boardPings?: boolean;
	/** Whether to ping the user when they level up. */
	levelUpPings?: boolean;
	/** Whether to ping the user when they are a top poster of the week. */
	weeklyPings?: boolean;
	/** Whether to automatically react to their messages with random emojis. */
	autoreactions?: boolean;
	useMentions?: boolean;
	dmReminders?: boolean;
}>("user_settings");
await userSettingsDatabase.init();

const command = defineCommand({
	data: {
		description: "Customize personal settings",

		options: {
			"board-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: `Enable pings when your messages get on #${CONSTANTS.channels.board?.name}`,
			},

			"level-up-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Enable pings you when you level up",
			},

			"weekly-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: `Enable pings if you are one of the most active people each week (#${CONSTANTS.channels.announcements?.name})`,
			},

			"autoreactions": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Enable automatic funny emoji reactions to your messages",
			},

			"use-mentions": {
				type: ApplicationCommandOptionType.Boolean,

				description:
					"Enable using pings instead of usernames so you can view profiles (may not work due to Discord bugs)",
			},
			"dm-reminders": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Send reminders in your DMs by default",
			},
		},
	},

	async interaction(interaction) {
		await interaction.reply(
			updateOptions(interaction.user, {
				autoreactions: interaction.options.getBoolean("autoreactions") ?? undefined,
				boardPings: interaction.options.getBoolean("board-pings") ?? undefined,
				levelUpPings: interaction.options.getBoolean("level-up-pings") ?? undefined,
				useMentions: interaction.options.getBoolean("use-mentions") ?? undefined,
				weeklyPings: interaction.options.getBoolean("weekly-pings") ?? undefined,
				dmReminders: interaction.options.getBoolean("dm-reminders") ?? undefined,
			}),
		);
	},
	buttons: {
		async toggleOption(interaction, option = "") {
			await interaction.reply(updateOptions(interaction.user, { [option]: "toggle" }));
		},
	},
});
export default command;

export function updateOptions(
	user: User,
	options: {
		autoreactions?: boolean | "toggle";
		boardPings?: boolean | "toggle";
		levelUpPings?: boolean | "toggle";
		useMentions?: boolean | "toggle";
		weeklyPings?: boolean | "toggle";
		dmReminders?: boolean | "toggle";
	},
) {
	const settingsForUser = getSettings(user, false);
	const defaultSettings = getDefaultSettings(user);

	const old = {
		autoreactions: settingsForUser?.autoreactions ?? defaultSettings.autoreactions,
		boardPings: settingsForUser?.boardPings ?? defaultSettings.boardPings,
		levelUpPings: settingsForUser?.levelUpPings ?? defaultSettings.levelUpPings,
		useMentions: settingsForUser?.useMentions ?? defaultSettings.useMentions,
		weeklyPings: settingsForUser?.weeklyPings ?? defaultSettings.weeklyPings,
		dmReminders: settingsForUser?.dmReminders ?? defaultSettings.dmReminders,
	};

	const updated = {
		user: user.id,
		boardPings:
			options.boardPings === "toggle"
				? !old.boardPings
				: options.boardPings ?? settingsForUser?.boardPings,
		levelUpPings:
			options.levelUpPings === "toggle"
				? !old.levelUpPings
				: options.levelUpPings ?? settingsForUser?.levelUpPings,
		weeklyPings:
			options.weeklyPings === "toggle"
				? !old.weeklyPings
				: options.weeklyPings ?? settingsForUser?.weeklyPings,
		autoreactions:
			options.autoreactions === "toggle"
				? !old.autoreactions
				: options.autoreactions ?? settingsForUser?.autoreactions,
		useMentions:
			options.useMentions === "toggle"
				? !old.useMentions
				: options.useMentions ?? settingsForUser?.useMentions,

		dmReminders:
			options.dmReminders === "toggle"
				? !old.dmReminders
				: options.dmReminders ?? settingsForUser?.dmReminders,
	};

	userSettingsDatabase.data = settingsForUser
		? userSettingsDatabase.data.map((data) => (data.user === user.id ? updated : data))
		: [...userSettingsDatabase.data, updated];

	return {
		ephemeral: true,
		content: `${CONSTANTS.emojis.statuses.yes} Updated your settings!`,

		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "boardPings_toggleOption",
						type: ComponentType.Button,
						label: "Board Pings",
						style: ButtonStyle[updated.boardPings ? "Success" : "Danger"],
					},
					{
						customId: "levelUpPings_toggleOption",
						type: ComponentType.Button,
						label: "Level Up Pings",
						style: ButtonStyle[updated.levelUpPings ? "Success" : "Danger"],
					},
					{
						customId: "weeklyPings_toggleOption",
						type: ComponentType.Button,
						label: `Weekly ${isAprilFools ? "Loser" : "Winner"}s Pings`,
						style: ButtonStyle[updated.weeklyPings ? "Success" : "Danger"],
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "autoreactions_toggleOption",
						type: ComponentType.Button,
						label: "Autoreactions",
						style: ButtonStyle[updated.autoreactions ? "Success" : "Danger"],
					},
					{
						customId: "useMentions_toggleOption",
						type: ComponentType.Button,
						label: "Use Mentions",
						style: ButtonStyle[updated.useMentions ? "Success" : "Danger"],
					},
					{
						customId: "dmReminders_toggleOption",
						type: ComponentType.Button,
						label: "DM Reminders",
						style: ButtonStyle[updated.dmReminders ? "Success" : "Danger"],
					},
				],
			},
		],
	} satisfies InteractionReplyOptions;
}

export function getSettings(
	user: { id: Snowflake },
	defaults?: true,
): {
	boardPings: boolean;
	levelUpPings: boolean;
	weeklyPings: boolean;
	autoreactions: boolean;
	useMentions: boolean;
	dmReminders: boolean;
};
export function getSettings(
	user: { id: Snowflake },
	defaults: false,
): {
	boardPings?: boolean;
	levelUpPings?: boolean;
	weeklyPings?: boolean;
	autoreactions?: boolean;
	useMentions?: boolean;
	dmReminders?: boolean;
};
export function getSettings(user: { id: Snowflake }, defaults: boolean = true) {
	const settings: {
		boardPings?: boolean;
		levelUpPings?: boolean;
		weeklyPings?: boolean;
		autoreactions?: boolean;
		useMentions?: boolean;
		dmReminders?: boolean;
	} = userSettingsDatabase.data.find((settings) => settings.user === user.id) ?? {};
	if (defaults) {
		const defaultSettings = getDefaultSettings(user);
		for (const setting of Object.keys(defaultSettings)) {
			if (!Object.prototype.hasOwnProperty.call(defaultSettings, setting)) return;
			if (settings[setting] === undefined) settings[setting] = defaultSettings[setting];
		}
	}
	return settings;
}

export function getDefaultSettings(user: { id: Snowflake }) {
	return {
		autoreactions: true,
		dmReminders: true,
		boardPings: process.env.NODE_ENV === "production",
		levelUpPings: process.env.NODE_ENV === "production",
		useMentions:
			(weeklyXpDatabase.data.findIndex((gain) => user.id === gain.user) + 1 || 30) < 30,
		weeklyPings: process.env.NODE_ENV === "production",
	};
}
