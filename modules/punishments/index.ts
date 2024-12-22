import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import {
	client,
	defineButton,
	defineMenuCommand,
	defineSelect,
	defineSubcommands,
} from "strife.js";

import { getStrikeById, getStrikes } from "./strikes.ts";

defineSubcommands(
	{
		name: "strikes",
		description: "View strike information",

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
				description: "View your or (staff only) someone else’s strikes",

				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "(Staff only) The user to see strikes for",
					},
					expired: {
						type: ApplicationCommandOptionType.Boolean,
						description: "Show expired strikes, italicized (defaults to true)",
					},
					removed: {
						type: ApplicationCommandOptionType.Boolean,
						description: "Show removed strikes, crossed out (defaults to false)",
					},
				},
			},
		},
	},
	async (interaction, options) => {
		switch (options.subcommand) {
			case "user": {
				const selected = options.options.user ?? interaction.user;
				await getStrikes(selected, interaction, options.options);
				break;
			}
			case "id": {
				await getStrikeById(interaction, options.options.id);
				break;
			}
		}
	},
);
defineMenuCommand(
	{ name: "List Strikes", type: ApplicationCommandType.User, restricted: true },
	async (interaction) => {
		await getStrikes(interaction.targetUser, interaction);
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
