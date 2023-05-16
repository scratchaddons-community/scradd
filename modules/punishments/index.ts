import { ApplicationCommandOptionType, GuildMember } from "discord.js";
import { client } from "../../lib/client.js";
import defineCommand from "../../lib/commands.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { defineButton, defineSelect } from "../../lib/components.js";
import { DEFAULT_STRIKES, MUTE_LENGTHS, STRIKES_PER_MUTE } from "./misc.js";
import { getStrikeById, getStrikes } from "./strikes.js";
import warn, { addStrikeBack, removeStrike } from "./warn.js";

defineCommand(
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
				description: "View your or (Mods only) someone else’s strikes",

				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "(Mods only) The user to see strikes for",
					},
				},
			},
		},

		censored: false,
	},
	async (interaction) => {
		if (!(interaction.member instanceof GuildMember))
			throw new TypeError("interaction.member is not a GuildMember");
		switch (interaction.options.getSubcommand(true)) {
			case "user": {
				const selected = interaction.options.getUser("user") ?? interaction.member;
				await getStrikes(selected, interaction);
				break;
			}
			case "id": {
				await interaction.reply(
					await getStrikeById(
						interaction.member,
						interaction.options.getString("id", true),
					),
				);
			}
		}
	},
);

defineButton("strike", async (interaction, id) => {
	if (!(interaction.member instanceof GuildMember))
		throw new TypeError("interaction.member is not a GuildMember");

	await interaction.reply(await getStrikeById(interaction.member, id ?? ""));
});
defineButton("viewStrikes", async (interaction, userId = "") => {
	await getStrikes(await client.users.fetch(userId), interaction);
});

defineSelect("selectStrike", async (interaction) => {
	if (!(interaction.member instanceof GuildMember))
		throw new TypeError("interaction.member is not a GuildMember");

	const [id] = interaction.values;
	if (id) await interaction.reply(await getStrikeById(interaction.member, id));
});

defineCommand(
	{
		name: "warn",
		description: "(Mods only) Warns a user",
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
		await warn(user, reason, strikes, interaction.user);

		await interaction.reply({
			allowedMentions: { users: [] },

			content: `${constants.emojis.statuses.yes} ${
				strikes ? "W" : "Verbally w"
			}arned ${user.toString()}${strikes > 1 ? ` ${strikes} times` : ""}. ${reason}`,
		});
	},
);
defineButton("removeStrike", removeStrike);
defineButton("addStrikeBack", addStrikeBack);
