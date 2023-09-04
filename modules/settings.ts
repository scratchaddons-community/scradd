import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
	type InteractionReplyOptions,
	type Snowflake,
	User,
	userMention,
} from "discord.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import Database from "../common/database.js";
import { getWeeklyXp } from "./xp/misc.js";
import { defineButton, defineChatCommand } from "strife.js";
import { disableComponents } from "../util/discord.js";

export const userSettingsDatabase = new Database<{
	/** The ID of the user. */
	id: Snowflake;
	/** Whether to ping the user when their message gets on the board. */
	boardPings?: boolean;
	/** Whether to ping the user when they level up. */
	levelUpPings?: boolean;
	/** Whether to automatically react to their messages with random emojis. */
	autoreactions?: boolean;
	useMentions?: boolean;
	dmReminders?: boolean;
	resourcesDmed?: boolean;
}>("user_settings");
await userSettingsDatabase.init();

defineChatCommand(
	{
		name: "settings",
		description: "Customize personal settings",

		options: {
			"board-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: `Enable pings when your messages get on #${config.channels.board?.name}`,
			},

			"level-up-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Enable pings you when you level up",
			},

			"weekly-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: `Enable pings if you are one of the most active people each week (#${config.channels.announcements?.name})`,
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

	async (interaction, options) => {
		await interaction.reply(
			updateSettings(interaction.user, {
				autoreactions: options.autoreactions,
				boardPings: options["board-pings"],
				levelUpPings: options["level-up-pings"],
				useMentions: options["use-mentions"],
				dmReminders: options["dm-reminders"],
			}),
		);
	},
);

defineButton("toggleSetting", async (interaction, setting = "") => {
	if (
		interaction.message.interaction?.user.id !== interaction.user.id &&
		!interaction.message.content.includes(userMention(interaction.user.id)) &&
		!interaction.message.flags.has("Ephemeral")
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to update other people’s settings!`,
		});
	}
	await interaction.reply(updateSettings(interaction.user, { [setting]: "toggle" }));

	if (!interaction.message.flags.has("Ephemeral"))
		await interaction.message.edit({
			components: disableComponents(interaction.message.components),
		});
});

export function updateSettings(
	user: User,
	settings: {
		autoreactions?: boolean | "toggle";
		boardPings?: boolean | "toggle";
		levelUpPings?: boolean | "toggle";
		useMentions?: boolean | "toggle";
		dmReminders?: boolean | "toggle";
		resourcesDmed?: true;
	},
) {
	const old = getSettings(user);
	const updated = {
		id: user.id,
		boardPings:
			settings.boardPings === "toggle"
				? !old.boardPings
				: settings.boardPings ?? old.boardPings,
		levelUpPings:
			settings.levelUpPings === "toggle"
				? !old.levelUpPings
				: settings.levelUpPings ?? old.levelUpPings,
		autoreactions:
			settings.autoreactions === "toggle"
				? !old.autoreactions
				: settings.autoreactions ?? old.autoreactions,
		useMentions:
			settings.useMentions === "toggle"
				? !old.useMentions
				: settings.useMentions ?? old.useMentions,
		dmReminders:
			settings.dmReminders === "toggle"
				? !old.dmReminders
				: settings.dmReminders ?? old.dmReminders,
		resourcesDmed: settings.resourcesDmed ?? old.resourcesDmed,
	};

	userSettingsDatabase.updateById(updated, {});

	return {
		ephemeral: true,
		content: `${constants.emojis.statuses.yes} Updated your settings!`,

		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "boardPings_toggleSetting",
						type: ComponentType.Button,
						label: "Board Pings",
						style: ButtonStyle[updated.boardPings ? "Success" : "Danger"],
					},
					{
						customId: "levelUpPings_toggleSetting",
						type: ComponentType.Button,
						label: "Level Up Pings",
						style: ButtonStyle[updated.levelUpPings ? "Success" : "Danger"],
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "autoreactions_toggleSetting",
						type: ComponentType.Button,
						label: "Autoreactions",
						style: ButtonStyle[updated.autoreactions ? "Success" : "Danger"],
					},
					{
						customId: "useMentions_toggleSetting",
						type: ComponentType.Button,
						label: "Use Mentions",
						style: ButtonStyle[updated.useMentions ? "Success" : "Danger"],
					},
					{
						customId: "dmReminders_toggleSetting",
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
): Required<typeof userSettingsDatabase.data[number]>;
export function getSettings(
	user: { id: Snowflake },
	defaults: false,
): typeof userSettingsDatabase.data[number];
export function getSettings(user: { id: Snowflake }, defaults: boolean = true) {
	const settings = userSettingsDatabase.data.find((settings) => settings.id === user.id) ?? {
		id: user.id,
	};
	if (defaults) {
		const defaultSettings = getDefaultSettings(user);
		for (const setting of Object.keys(defaultSettings)) {
			settings[setting] ??= defaultSettings[setting];
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
		useMentions: getWeeklyXp(user.id) > 100,
		resourcesDmed: false,
	};
}
