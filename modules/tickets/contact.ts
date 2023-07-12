import {
	type AnySelectMenuInteraction,
	type APIEmbedField,
	ButtonInteraction,
	ButtonStyle,
	ChannelType,
	ChatInputCommandInteraction,
	ComponentType,
	GuildMember,
	InteractionResponse,
	InteractionType,
	ModalSubmitInteraction,
	type TextInputComponentData,
	TextInputStyle,
	time,
	TimestampStyles,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import log, { LoggingEmojis } from "../logging/misc.js";
import { PARTIAL_STRIKE_COUNT, strikeDatabase } from "../punishments/misc.js";
import {
	type Category,
	getThreadFromMember,
	SA_CATEGORY,
	SERVER_CATEGORY,
	TICKET_CATEGORIES,
} from "./misc.js";

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
			minLength: 20,
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
			minLength: 20,
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
			minLength: 20,
			required: true,
			maxLength: 1024,
			style: TextInputStyle.Paragraph,
			label: "What is the bug?",
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
			minLength: 20,
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
			minLength: 20,
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
			minLength: 20,
			required: true,
			maxLength: 1024,
			style: TextInputStyle.Paragraph,
			label: "Why are you contacting us?",
		},
	],
} satisfies Record<Category, TextInputComponentData[]>;

const modCategory = "mod";
const categoryToDescription = {
	appeal: "Strike Appeal",
	report: "User Report",
	role: "Role Request",
	bug: "Scradd Bug",
	rules: "Rule Clarification",
	server: "Other Scratch Servers",
	other: "Other",
	[modCategory]: "Contact User",
} satisfies Record<Category | typeof modCategory, string>;

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
				constants.emojis.statuses.no
			} Please don't contact mods for SA help. Instead, put your suggestions in ${config.channels.suggestions?.toString()}, bug reports in ${config.channels.bugs?.toString()}, and other questions, comments, concerns, or etcetera in <#${
				config.channels.support
			}>.`,

			ephemeral: true,
		});
	}

	if (option === SERVER_CATEGORY) {
		return await interaction.reply({
			content: `${constants.emojis.statuses.no} Please don't contact mods for server suggestions. Instead, share them in <#${config.channels.server}>.`,

			ephemeral: true,
		});
	}

	const existing = await getThreadFromMember(interaction.user);
	if (existing)
		return await interaction.reply({
			content: `${
				constants.emojis.statuses.no
			} You already have an open ticket! Please send the mods messages in ${existing.toString()}.`,

			ephemeral: true,
		});

	if (!TICKET_CATEGORIES.includes(option))
		throw new TypeError(`Unknown ticket category: ${option}`);

	const fields = allFields[option];

	if (!fields) throw new ReferenceError(`Unknown ticket category: ${option}`);

	await interaction.showModal({
		title: categoryToDescription[option],
		customId: `${option}_contactMods`,
		components: fields.map((field) => ({
			type: ComponentType.ActionRow,
			components: [field.customId === "strike" ? { ...field, value: strikeId } : field],
		})),
	});
}
export default async function contactMods(
	interaction:
		| ModalSubmitInteraction
		| ChatInputCommandInteraction<"cached" | "raw">
		| ButtonInteraction,
	options: Category | GuildMember,
) {
	const option = options instanceof GuildMember ? modCategory : options;

	const member =
		options instanceof GuildMember
			? options
			: interaction.member || (await config.guild.members.fetch(interaction.user.id));
	if (!(member instanceof GuildMember)) throw new TypeError("member is not a GuildMember!");

	if (!config.channels.tickets) throw new ReferenceError("Could not find tickets channel!");

	const oldThread = await getThreadFromMember(member);
	if (oldThread)
		return await interaction.editReply(
			`${
				constants.emojis.statuses.no
			} You already have an open ticket! Please use ${oldThread?.toString()}.`,
		);

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
						[modCategory]: {},
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

	const thread = await config.channels.tickets.threads.create({
		name: `${member.user.displayName} (${member.id})`,
		reason: "Ticket opened",
		type: ChannelType.PrivateThread,
		invitable: false,
	});
	await log(
		`${LoggingEmojis.Thread} ${interaction.user.toString()} contacted ${
			option === modCategory ? member.toString() : "mods"
		}: ${thread?.toString()}`,
	);

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
				title: categoryToDescription[option],

				color: member.displayColor,

				author: { icon_url: member.displayAvatarURL(), name: member.displayName },
				...(body
					? fields.length === 0
						? { description: body }
						: { fields: [...fields, { name: constants.zeroWidthSpace, value: body }] }
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
					: `${constants.emojis.statuses.no} ${member.toString()} has never been warned!`,

				footer: filtered.length
					? {
							text: `Page 1/${numberOfPages}${
								constants.footerSeperator
							} ${totalStrikeCount} strike${totalStrikeCount === 1 ? "" : "s"}`,
					  }
					: undefined,

				author: { icon_url: member.displayAvatarURL(), name: member.displayName },
				color: member.displayColor,
			},
		],
		content:
			option === modCategory || process.env.NODE_ENV === "development"
				? ""
				: config.roles.mod?.toString(),
		allowedMentions: { parse: ["roles"] },
	});

	await thread?.members.add(member, "Thread created");

	return thread;
}

export async function contactUser(
	member: GuildMember,
	interaction: ChatInputCommandInteraction<"cached" | "raw"> | ButtonInteraction,
) {
	await interaction.deferReply({ ephemeral: true });
	const existingThread = await getThreadFromMember(member);

	if (existingThread) {
		await interaction.editReply(
			`${
				constants.emojis.statuses.no
			} ${member.toString()} already has a ticket open! Talk to them in ${existingThread.toString()}.`,
		);

		return;
	}

	const message = await interaction.editReply({
		content: `Are you sure you want to contact **${member.toString()}**?`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Contact",
						style: ButtonStyle.Success,
						customId: `confirm-${interaction.id}`,
					},
				],
			},
		],
		allowedMentions: { users: [] },
	});

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) =>
			buttonInteraction.customId.endsWith(`-${interaction.id}`) &&
			buttonInteraction.user.id === interaction.user.id,

		time: constants.collectorTime,
		max: 1,
	});

	collector
		.on("collect", async (buttonInteraction) => {
			await buttonInteraction.deferReply({ ephemeral: true });
			const thread = await contactMods(interaction, member);
			if (thread)
				await buttonInteraction.editReply(
					`${
						constants.emojis.statuses.yes
					} **Ticket opened!** Send ${member.toString()} a message in ${thread.toString()}.`,
				);
		})
		.on("end", async () => {
			await interaction.editReply({ components: disableComponents(message.components) });
		});
}
