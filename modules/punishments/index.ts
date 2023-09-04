import { ApplicationCommandOptionType } from "discord.js";
import constants from "../../common/constants.js";
import { client, defineChatCommand, defineButton, defineSelect, defineSubcommands } from "strife.js";
import { DEFAULT_STRIKES, MUTE_LENGTHS, STRIKES_PER_MUTE } from "./misc.js";
import { getStrikeById, getStrikes } from "./strikes.js";
import warn, { addStrikeBack, removeStrike } from "./warn.js";
import ban from "./ban.js";

defineSubcommands(
	{
		name: "strikes",
		description: "Commands to view strike information",

		subcommands: {
			id: {
				description: "View a strike by ID",

				options: {
					id: {
						required: true,
						type: ApplicationCommandOptionType.String,
						description: "The strike’s ID",
					},
				},
			},

			user: {
				description: "View your or (mod only) someone else’s strikes",

				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "(Mod only) The user to see strikes for",
					},
				},
			},
		},

		censored: false,
	},
	async (interaction) => {
		switch (interaction.options.getSubcommand(true)) {
			case "user": {
				const selected = interaction.options.getUser("user") ?? interaction.user;
				await getStrikes(selected, interaction);
				break;
			}
			case "id": {
				await getStrikeById(interaction, interaction.options.getString("id", true));
			}
		}
	},
);

defineButton("strike", async (interaction, id) => await getStrikeById(interaction, id));
defineButton("viewStrikes", async (interaction, userId = "") => {
	await getStrikes(await client.users.fetch(userId), interaction);
});

defineSelect("selectStrike", async (interaction) => {
	const [id] = interaction.values;
	if (id) await getStrikeById(interaction, id);
});

defineChatCommand(
	{
		name: "warn",
		description: "(Mod only) Warns a user",
		restricted: true,

		options: {
			user: {
				type: ApplicationCommandOptionType.User,
				description: "The user to warn",
				required: true,
			},

			reason: {
				type: ApplicationCommandOptionType.String,
				description: "Reason for the warning",
				required: process.env.NODE_ENV === "production",
			},

			strikes: {
				type: ApplicationCommandOptionType.Integer,
				description: `How many strikes to add (defaults to ${DEFAULT_STRIKES})`,
				maxValue: STRIKES_PER_MUTE * MUTE_LENGTHS.length + 1,
				minValue: 0,
			},
		},
	},

	async (interaction) => {
		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason") || "No reason given.";
		const strikes = interaction.options.getInteger("strikes") ?? DEFAULT_STRIKES;
		await interaction.deferReply();
		const success = await warn(user, reason, strikes, interaction.user);

		await interaction.editReply(
			success
				? `${constants.emojis.statuses.yes} ${
						strikes ? "Warned" : "Verbally warned"
				  } ${user.toString()}${strikes > 1 ? ` ${strikes} times` : ""}. ${reason}`
				: `${constants.emojis.statuses.no} Can not warn <@${user.toString()}>.`,
		);
	},
);
defineButton("removeStrike", removeStrike);
defineButton("addStrikeBack", addStrikeBack);

defineChatCommand(
	{
		name: "ban-user",
		description: "(Mod only) Bans a user",
		restricted: true,

		options: {
			"user": {
				type: ApplicationCommandOptionType.User,
				description: "The user to ban",
				required: true,
			},

			"reason": {
				type: ApplicationCommandOptionType.String,
				description: "Reason for the ban",
				required: process.env.NODE_ENV === "production",
			},

			"delete-range": {
				type: ApplicationCommandOptionType.String,
				description: "How far back to delete their messages (defaults to none)",
			},

			"unban-in": {
				type: ApplicationCommandOptionType.String,
				description: "When to unban them in (defaults to never)",
			},
		},
	},

	ban,
);
