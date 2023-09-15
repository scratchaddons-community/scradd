import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ComponentType,
	TextInputStyle,
} from "discord.js";
import constants from "../../common/constants.js";
import {
	client,
	defineChatCommand,
	defineButton,
	defineSelect,
	defineSubcommands,
	defineMenuCommand,
	defineModal,
} from "strife.js";
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
	async (interaction, options) => {
		switch (options.subcommand) {
			case "user": {
				const selected = options.options.user ?? interaction.user;
				await getStrikes(selected, interaction);
				break;
			}
			case "id": {
				await getStrikeById(interaction, options.options.id);
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

	async (interaction, options) => {
		const reason = options.reason || "No reason given.";
		const strikes = options.strikes ?? DEFAULT_STRIKES;
		await interaction.deferReply();
		const success = await warn(options.user, reason, strikes, interaction.user);

		await interaction.editReply(
			success
				? `${constants.emojis.statuses.yes} ${
						strikes ? "Warned" : "Verbally warned"
				  } ${options.user.toString()}${strikes > 1 ? ` ${strikes} times` : ""}. ${reason}`
				: `${constants.emojis.statuses.no} Can not warn <@${options.user.toString()}>.`,
		);
	},
);
defineMenuCommand(
	{ name: "Warn User", type: ApplicationCommandType.User, restricted: true },
	async (interaction) => {
		await interaction.showModal({
			title: "Warn User",
			customId: `${interaction.targetUser.id}_warn`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							label: "Reason",
							type: ComponentType.TextInput,
							style: TextInputStyle.Paragraph,
							customId: "reason",
							value:
								process.env.NODE_ENV === "production"
									? undefined
									: "No reason given.",
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							label: "Strikes",
							type: ComponentType.TextInput,
							style: TextInputStyle.Short,
							customId: "strikes",
							value: "1",
						},
					],
				},
			],
		});
	},
);
defineModal("warn", async (interaction, id) => {
	const user = await client.users.fetch(id);
	const reason = interaction.fields.getTextInputValue("reason");
	const strikes = +interaction.fields.getTextInputValue("strikes");
	await interaction.deferReply();

	const success = await warn(user, reason, Number.isNaN(strikes) ? 1 : strikes, interaction.user);
	await interaction.editReply(
		success
			? `${constants.emojis.statuses.yes} ${
					strikes < 1 ? "Warned" : "Verbally warned"
			  } ${user.toString()}${strikes > 1 ? ` ${strikes} times` : ""}. ${reason}`
			: `${constants.emojis.statuses.no} Can not warn <@${user.toString()}>.`,
	);
});
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
defineMenuCommand(
	{ name: "Ban User", type: ApplicationCommandType.User, restricted: true },
	async (interaction) => {
		await interaction.showModal({
			title: "Ban User",
			customId: `${interaction.targetUser.id}_ban`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							label: "Reason",
							type: ComponentType.TextInput,
							style: TextInputStyle.Paragraph,
							customId: "reason",
							value:
								process.env.NODE_ENV === "production"
									? undefined
									: "No reason given.",
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							label: "Message Delete Range",
							type: ComponentType.TextInput,
							style: TextInputStyle.Short,
							customId: "delete-range",
							required: false,
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							label: "Unban In",
							type: ComponentType.TextInput,
							style: TextInputStyle.Short,
							customId: "unban-in",
							required: false,
						},
					],
				},
			],
		});
	},
);
defineModal("ban", async (interaction, id) => {
	const user = await client.users.fetch(id);
	const reason = interaction.fields.getTextInputValue("reason");
	const deleteRange = interaction.fields.fields.get("delete-range")?.value;
	const unbanIn = interaction.fields.fields.get("unban-in")?.value;
	await ban(interaction, { user, reason, "delete-range": deleteRange, "unban-in": unbanIn });
});
