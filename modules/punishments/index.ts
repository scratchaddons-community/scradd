import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ComponentType,
	TextInputStyle,
} from "discord.js";
import {
	client,
	defineButton,
	defineChatCommand,
	defineMenuCommand,
	defineModal,
	defineSelect,
	defineSubcommands,
} from "strife.js";

import constants from "../../common/constants.ts";
import ban from "./ban.ts";
import { DEFAULT_STRIKES, MAX_STRIKES } from "./misc.ts";
import { getStrikeById, getStrikes } from "./strikes.ts";
import warn, { addStrikeBack, removeStrike } from "./warn.ts";

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
				description: "View your or (mods only) someone else’s strikes",

				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "(Mods only) The user to see strikes for",
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

		censored: false,
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

defineChatCommand(
	{
		name: "warn",
		description: "Warn a user",
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
				required: constants.env === "production",
				minLength: 10,
				maxLength: 1024,
			},

			strikes: {
				type: ApplicationCommandOptionType.Integer,
				description: `How many times to warn them (defaults to ${DEFAULT_STRIKES})`,
				maxValue: MAX_STRIKES,
				minValue: 0,
			},
		},
	},

	async (interaction, options) => {
		const reason = options.reason || constants.defaultPunishment;
		const strikes = options.strikes ?? DEFAULT_STRIKES;
		await interaction.deferReply();
		const success = await warn(options.user, reason, strikes, interaction.user);
		const displayedStrikes = Math.round(strikes);

		await interaction.editReply(
			success ?
				`${constants.emojis.statuses.yes} ${
					strikes < 1 ? "Verbally warned" : "Warned"
				} ${options.user.toString()}${
					displayedStrikes > 1 ? ` ${displayedStrikes} times` : ""
				}.${success === "no-dm" ? " I was not able to DM them." : ""} ${reason}`
			:	`${constants.emojis.statuses.no} Can not warn ${options.user.toString()}.`,
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
								constants.env === "production" ?
									undefined
								:	constants.defaultPunishment,
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
	const rawStrikes = +interaction.fields.getTextInputValue("strikes");
	await interaction.deferReply();

	const strikes =
		Number.isNaN(rawStrikes) || rawStrikes < 0 ?
			1
		:	Math.min(MAX_STRIKES, Math.floor(rawStrikes));
	const success = await warn(user, reason, strikes, interaction.user);
	await interaction.editReply(
		success ?
			`${constants.emojis.statuses.yes} ${
				strikes < 1 ? "Verbally warned" : "Warned"
			} ${user.toString()}${strikes > 1 ? ` ${strikes} times` : ""}.${
				success === "no-dm" ? " I was not able to DM them." : ""
			} ${reason}`
		:	`${constants.emojis.statuses.no} Can not warn ${user.toString()}.`,
	);
});
defineButton("removeStrike", removeStrike);
defineButton("addStrikeBack", addStrikeBack);

defineChatCommand(
	{
		name: "ban-user",
		description: "Ban a member",
		restricted: true,

		options: {
			"user": {
				type: ApplicationCommandOptionType.User,
				description: "The member to ban",
				required: true,
			},

			"reason": {
				type: ApplicationCommandOptionType.String,
				description: "Reason for the ban",
				required: constants.env === "production",
				minLength: 10,
				maxLength: 1024,
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
								constants.env === "production" ?
									undefined
								:	constants.defaultPunishment,
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							label: "Message Delete Range",
							placeholder: "1d",
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
