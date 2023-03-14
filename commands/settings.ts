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

export const userSettingsDatabase = new Database<{
	/** The ID of the user. */
	user: Snowflake;
	/** Whether to ping the user when their message gets on the board. */
	boardPings: boolean;
	/** Whether to ping the user when they level up. */
	levelUpPings: boolean;
	/** Whether to ping the user when they are a top poster of the week. */
	weeklyPings: boolean;
	/** Whether to automatically react to their messages with random emojis. */
	autoreactions: boolean;
	useMentions?: boolean;
	dad?: boolean;
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
			"dad": {
				type: ApplicationCommandOptionType.Boolean,

				description: "You know what this is.",
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
				dad: interaction.options.getBoolean("dad") ?? undefined,
			}),
		);
	},
	buttons: {
		async toggleOption(interaction, option = "") {
			await interaction.message.edit(updateOptions(interaction.user, { [option]: "toggle" }));
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
		dad?: boolean | "toggle";
	},
) {
	const settingsForUser = userSettingsDatabase.data.find((settings) => settings.user === user.id);

	const old = {
		autoreactions: settingsForUser?.autoreactions ?? true,
		boardPings: settingsForUser?.boardPings ?? process.env.NODE_ENV === "production",
		levelUpPings: settingsForUser?.levelUpPings ?? process.env.NODE_ENV === "production",
		useMentions:
			settingsForUser?.useMentions ??
			(weeklyXpDatabase.data.findIndex((gain) => user.id === gain.user) + 1 ||
				weeklyXpDatabase.data.length) < 30,
		weeklyPings: settingsForUser?.weeklyPings ?? process.env.NODE_ENV === "production",
		dad: settingsForUser?.weeklyPings ?? false,
	};
	const autoreactions =
			options.autoreactions === "toggle"
				? !old.autoreactions
				: options.autoreactions ?? old.autoreactions,
		boardPings =
			options.boardPings === "toggle"
				? !old.boardPings
				: options.boardPings ?? old.boardPings,
		levelUpPings =
			options.levelUpPings === "toggle"
				? !old.levelUpPings
				: options.levelUpPings ?? old.levelUpPings,
		useMentions =
			options.useMentions === "toggle"
				? !old.useMentions
				: options.useMentions ?? old.useMentions,
		weeklyPings =
			options.weeklyPings === "toggle"
				? !old.weeklyPings
				: options.weeklyPings ?? old.weeklyPings,
		dad = options.dad === "toggle" ? !old.dad : options.dad ?? old.dad;

	userSettingsDatabase.data = settingsForUser
		? userSettingsDatabase.data.map((data) =>
				data.user === user.id
					? {
							user: data.user,
							boardPings,
							levelUpPings,
							weeklyPings,
							autoreactions,
							useMentions,
							dad,
					  }
					: data,
		  )
		: [
				...userSettingsDatabase.data,
				{
					user: user.id,
					boardPings,
					levelUpPings,
					weeklyPings,
					autoreactions,
					useMentions,
					dad,
				},
		  ];

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
						style: ButtonStyle[boardPings ? "Success" : "Danger"],
					},
					{
						customId: "levelUpPings_toggleOption",
						type: ComponentType.Button,
						label: "Level Up Pings",
						style: ButtonStyle[levelUpPings ? "Success" : "Danger"],
					},
					{
						customId: "weeklyPings_toggleOption",
						type: ComponentType.Button,
						label: "Weekly Winner Pings",
						style: ButtonStyle[weeklyPings ? "Success" : "Danger"],
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
						style: ButtonStyle[autoreactions ? "Success" : "Danger"],
					},
					{
						customId: "useMentions_toggleOption",
						type: ComponentType.Button,
						label: "Use Mentions",
						style: ButtonStyle[useMentions ? "Success" : "Danger"],
					},
					{
						customId: "dad_toggleOption",
						type: ComponentType.Button,
						label: "Dad",
						style: ButtonStyle[dad ? "Success" : "Danger"],
					},
				],
			},
		],
	} satisfies InteractionReplyOptions;
}
