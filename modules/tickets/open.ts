import {
	AnySelectMenuInteraction,
	APIEmbedField,
	ButtonInteraction,
	ButtonStyle,
	ChannelType,
	ChatInputCommandInteraction,
	ComponentType,
	GuildMember,
	InteractionResponse,
	InteractionType,
	ModalSubmitInteraction,
	TextInputComponentData,
	TextInputStyle,
	time,
	TimestampStyles,
} from "discord.js";

import CONSTANTS from "../../common/CONSTANTS.js";
import { disableComponents } from "../../util/discord.js";
import log from "../modlogs/logging.js";
import { PARTIAL_STRIKE_COUNT, strikeDatabase } from "../punishments/misc.js";
import { Category, getThreadFromMember, SA_CATEGORY, TICKET_CATEGORIES } from "./misc.js";

const allFields = {
	appeal: [
		{
			type: ComponentType.TextInput,
			customId: "strike",
			required: true,
			style: TextInputStyle.Short,
			maxLength: 20,
			label: "Strike ID to appeal (from /strikes user)",
		},
		{
			type: ComponentType.TextInput,
			customId: "BODY",
			required: true,
			style: TextInputStyle.Paragraph,
			maxLength: 1024,
			label: "Why should we remove this strike?",
		},
	],

	report: [
		{
			type: ComponentType.TextInput,
			customId: "user",
			required: true,
			minLength: 2,
			maxLength: 37,
			style: TextInputStyle.Short,
			label: "Who are you reporting?",
		},
		{
			type: ComponentType.TextInput,
			customId: "BODY",
			required: true,
			maxLength: 1024,
			style: TextInputStyle.Paragraph,
			label: "Why are you reporting them?",
		},
	],

	role: [
		{
			type: ComponentType.TextInput,
			customId: "role",
			required: true,
			minLength: 10,
			maxLength: 50,
			style: TextInputStyle.Short,
			label: "Which role(s) are you requesting?",
		},
		{
			type: ComponentType.TextInput,
			customId: "account",
			required: true,
			maxLength: 500,
			style: TextInputStyle.Paragraph,
			label: "What are your GitHub/Transifex usernames?",
		},
	],

	bug: [
		{
			type: ComponentType.TextInput,
			customId: "BODY",
			required: true,
			maxLength: 1024,
			style: TextInputStyle.Paragraph,
			label: "What is the bug?",
		},
	],

	update: [
		{
			type: ComponentType.TextInput,
			customId: "BODY",
			required: true,
			maxLength: 1024,
			style: TextInputStyle.Paragraph,
			label: "What is the suggested change?",
		},
	],

	rules: [
		{
			type: ComponentType.TextInput,
			customId: "rule",
			required: true,
			maxLength: 20,
			style: TextInputStyle.Short,
			label: "Which rule do you have questions on?",
		},
		{
			type: ComponentType.TextInput,
			customId: "BODY",
			required: true,
			maxLength: 1024,
			style: TextInputStyle.Paragraph,
			label: "What is your question?",
		},
	],

	server: [
		{
			type: ComponentType.TextInput,
			customId: "BODY",
			required: true,
			maxLength: 75,
			style: TextInputStyle.Short,
			label: "Server invite",
		},
	],

	other: [
		{
			type: ComponentType.TextInput,
			customId: "BODY",
			required: true,
			maxLength: 1024,
			style: TextInputStyle.Paragraph,
			label: "Why are you contacting us?",
		},
	],
} satisfies Record<Category, TextInputComponentData[]>;

const categoryToDescription = {
	appeal: "Strike Appeal",
	report: "Report",
	role: "Role Request",
	bug: "Scradd Bug",
	update: "Server Suggestion",
	rules: "Rule Clarification",
	server: "Add An Other Scratch Server",
	other: "Other",
} satisfies Record<Category, string>;

export async function gatherTicketInfo(
	interaction: AnySelectMenuInteraction,
): Promise<InteractionResponse<boolean> | undefined>;
export async function gatherTicketInfo(
	interaction: ButtonInteraction,
	category: Exclude<Category, "appeal">,
): Promise<InteractionResponse<boolean> | undefined>;
export async function gatherTicketInfo(
	interaction: ButtonInteraction,
	category: "appeal",
	strikeId: string,
): Promise<InteractionResponse<boolean> | undefined>;
export async function gatherTicketInfo(
	interaction: AnySelectMenuInteraction | ButtonInteraction,
	category?: Category,
	strikeId?: string,
) {
	const option = interaction.isAnySelectMenu() ? interaction.values[0] : category;

	if (option === SA_CATEGORY) {
		return await interaction.reply({
			content: `${
				CONSTANTS.emojis.statuses.no
			} Please don't contact mods for SA help. Instead, put your suggestions in ${CONSTANTS.channels.suggestions?.toString()}, bug reports in <#1019734503465439326>, and other questions, comments, concerns, or etcetera in <#826250884279173162>.`,

			ephemeral: true,
		});
	}

	const existing = await getThreadFromMember(interaction.user);
	if (existing)
		return await interaction.reply({
			content: `${
				CONSTANTS.emojis.statuses.no
			} You already have an open ticket! Please send the mods messages in ${existing.toString()}.`,

			ephemeral: true,
		});

	if (!TICKET_CATEGORIES.includes(option))
		throw new TypeError(`Unknown ticket category: ${option}`);

	const fields = allFields[option];

	if (!fields) throw new ReferenceError(`Unknown ticket category: ${option}`);

	await interaction.showModal({
		title: `Contact Mods - ${categoryToDescription[option]}`,
		customId: `${option}_contactMods`,
		components: fields.map((field) => ({
			type: ComponentType.ActionRow,
			components: [field.customId === "strike" ? { ...field, value: strikeId } : field],
		})),
	});
}
export default async function startTicket(
	interaction:
		| ModalSubmitInteraction
		| ChatInputCommandInteraction<"cached" | "raw">
		| ButtonInteraction,
	options: Category | GuildMember,
) {
	const option = options instanceof GuildMember ? "mod" : options;

	const member =
		options instanceof GuildMember
			? options
			: interaction.member || (await CONSTANTS.guild.members.fetch(interaction.user.id));
	if (!(member instanceof GuildMember)) throw new TypeError("member is not a GuildMember!");

	const oldThread = await getThreadFromMember(member);
	if (oldThread) return oldThread;
	const fields =
		interaction.type === InteractionType.ModalSubmit
			? Object.entries(
					{
						appeal: { "Strike ID": "strike" },
						report: { "Reported User": "user" },
						role: { "Role(s)": "role", "Account(s)": "account" },
						bug: {},
						update: {},
						rules: { Rule: "rule" },
						server: {},
						other: {},
						mod: {},
					}[option],
			  ).map<APIEmbedField>(([name, key]) => ({
					name,
					value: interaction.fields.getTextInputValue(key),
					inline: true,
			  }))
			: [];
	const body =
		option !== "role" &&
		interaction.type === InteractionType.ModalSubmit &&
		interaction.fields.getTextInputValue("BODY");

	const date = new Date();
	const thread = await CONSTANTS.channels.contact?.threads.create({
		name: `${member.user.username} (${date
			.getUTCFullYear()
			.toLocaleString([], { useGrouping: false })}-${(date.getUTCMonth() + 1).toLocaleString(
			[],
			{ minimumIntegerDigits: 2 },
		)}-${date.getUTCDate().toLocaleString([], { minimumIntegerDigits: 2 })})`,

		reason: "Ticket opened",
		type: ChannelType.PrivateThread,
		invitable: false,
	});
	await log(`🔴 Ticket ${thread?.toString()} opened by ${interaction.user.toString()}`);

	const strikes = strikeDatabase.data
		.filter((strike) => strike.user === member.id)
		.sort((one, two) => two.date - one.date);

	const totalStrikeCount = Math.trunc(
		strikes.reduce(
			(accumulator, { count, removed }) => count * Number(!removed) + accumulator,
			0,
		),
	);

	const numberOfPages = Math.ceil(strikes.length / 15);

	const filtered = strikes.filter((_, index) => index < 15);

	await thread?.send({
		components: filtered.length
			? [
					{
						type: ComponentType.ActionRow,

						components:
							filtered.length > 5
								? [
										{
											type: ComponentType.StringSelect,
											customId: "_selectStrike",
											placeholder: "View more information on a strike",

											options: filtered.map((strike) => ({
												label: String(strike.id),
												value: String(strike.id),
											})),
										},
								  ]
								: filtered.map((strike) => ({
										type: ComponentType.Button,
										customId: `${strike.id}_strike`,
										label: String(strike.id),
										style: ButtonStyle.Secondary,
								  })),
					},
			  ]
			: [],

		embeds: [
			{
				title:
					"Contact " +
					(option === "mod" ? "User" : `Mods - ${categoryToDescription[option]}`),

				color: member.displayColor,

				author: { icon_url: member.displayAvatarURL(), name: member.displayName },
				...(body
					? fields.length === 0
						? { description: body }
						: { fields: [...fields, { name: CONSTANTS.zeroWidthSpace, value: body }] }
					: { fields }),
			},
			{
				title: `${member.displayName}’s strikes`,
				description: filtered.length
					? filtered
							.map(
								(strike) =>
									`${strike.removed ? "~~" : ""}\`${strike.id}\`${
										strike.count === 1
											? ""
											: ` (${
													strike.count === PARTIAL_STRIKE_COUNT
														? "verbal"
														: `\\*${strike.count}`
											  })`
									} - ${time(
										new Date(strike.date),
										TimestampStyles.RelativeTime,
									)}${strike.removed ? "~~" : ""}`,
							)
							.join("\n")
					: `${CONSTANTS.emojis.statuses.no} ${member.toString()} has never been warned!`,

				footer: filtered.length
					? {
							text: `Page 1/${numberOfPages}${
								CONSTANTS.footerSeperator
							} ${totalStrikeCount} strike${totalStrikeCount === 1 ? "" : "s"}`,
					  }
					: undefined,

				author: { icon_url: member.displayAvatarURL(), name: member.displayName },
				color: member.displayColor,
			},
		],
		content:
			option === "mod" || process.env.NODE_ENV === "development"
				? ""
				: CONSTANTS.roles.mod?.toString(),
		allowedMentions: { parse: ["roles"] },
	});

	await thread?.members.add(member);

	return thread;
}

export async function contactUser(
	member: GuildMember,
	interaction: ChatInputCommandInteraction<"cached" | "raw"> | ButtonInteraction,
) {
	const existingThread = await getThreadFromMember(member);

	if (existingThread) {
		await interaction.reply({
			content: `${
				CONSTANTS.emojis.statuses.no
			} ${member.toString()} already has a ticket open! Talk to them in ${existingThread.toString()}.`,

			ephemeral: true,
		});

		return;
	}

	const message = await interaction.reply({
		content: `Are you sure you want to start a ticket with **${member.toString()}**?`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Confirm",
						style: ButtonStyle.Success,
						customId: `confirm-${interaction.id}`,
					},
					{
						type: ComponentType.Button,
						label: "Cancel",
						customId: `cancel-${interaction.id}`,
						style: ButtonStyle.Danger,
					},
				],
			},
		],
		fetchReply: true,
		allowedMentions: { users: [] },
		ephemeral: true,
	});

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) =>
			buttonInteraction.customId.endsWith(`-${interaction.id}`) &&
			buttonInteraction.user.id === interaction.user.id,

		time: CONSTANTS.collectorTime,
		max: 1,
	});

	collector
		.on("collect", async (buttonInteraction) => {
			if (buttonInteraction.customId.startsWith("confirm-")) {
				const thread = await startTicket(interaction, member);
				if (thread)
					await buttonInteraction.reply({
						content: `${
							CONSTANTS.emojis.statuses.yes
						} **Ticket opened!** Send ${member.toString()} a message in ${thread.toString()}.`,
						ephemeral: true,
					});
			} else {
				await buttonInteraction.deferUpdate();
			}
		})
		.on("end", async () => {
			await message.edit({ components: disableComponents(message.components) });
		});
}

