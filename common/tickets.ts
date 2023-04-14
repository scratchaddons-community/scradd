import {
	APIEmbedField,
	ButtonInteraction,
	ButtonStyle,
	ChannelType,
	ChatInputCommandInteraction,
	ComponentType,
	GuildMember,
	InteractionReplyOptions,
	InteractionResponse,
	InteractionType,
	ModalSubmitInteraction,
	StringSelectMenuInteraction,
	TextInputComponentData,
	TextInputStyle,
	ThreadChannel,
	time,
	TimestampStyles,
	User,
} from "discord.js";

import { asyncFilter } from "../util/promises.js";
import CONSTANTS from "./CONSTANTS.js";
import log from "./logging.js";
import { strikeDatabase } from "./punishments.js";

export const TICKET_CATEGORIES = [
	"appeal",
	"report",
	"role",
	"bug",
	"update",
	"rules",
	"server",
	"other",
] as const;
type Category = typeof TICKET_CATEGORIES[number];
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
			style: TextInputStyle.Paragraph,
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

export const ticketCategoryMessage = {
	content: `👍 Thanks for reaching out!`,
	components: [
		{
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.StringSelect,
					customId: "_contactMods",
					options: [
						...([
							{ label: "Appeal a strike", value: "appeal" },
							{ label: "Report a user", value: "report" },
							{ label: "Request a contributor role", value: "role" },
							{ label: "Report a Scradd bug", value: "bug" },
							{ label: "Suggest a server change", value: "update" },
							{ label: "Get clarification on a rule", value: "rules" },
							{ label: "Get help with Scratch Addons", value: "sa" },
							{ label: "Add your server to Other Scratch Servers", value: "server" },
							{ label: "Other", value: "other" },
						] as const),
					],
					placeholder: "What do you need help with?",
				},
			],
		},
	],
	ephemeral: true,
} satisfies InteractionReplyOptions;

const categoryToDescription = Object.fromEntries(
	ticketCategoryMessage.components[0]?.components[0]?.options.map(({ label, value }) => [
		value,
		label,
	]) || [],
);

/**
 * Get the non-mod involved in a ticket.
 *
 * @param thread - Ticket thread.
 *
 * @returns User who messages are being sent to.
 */
export async function getUserFromTicket(thread: ThreadChannel): Promise<void | User> {
	const messages = await thread.messages.fetch({ after: thread.id, limit: 2 });
	return messages.first()?.mentions.users.first();
}

/**
 * Find a ticket for a user.
 *
 * @param user - The user to search for.
 *
 * @returns Ticket thread.
 */
export async function getThreadFromMember(user: GuildMember | User): Promise<ThreadChannel | void> {
	if (!CONSTANTS.channels.contact) return;

	const { threads } = await CONSTANTS.channels.contact.threads.fetchActive();

	return (
		await asyncFilter(
			threads.toJSON(),
			async (thread) => (await getUserFromTicket(thread))?.id === user.id && thread,
		).next()
	).value;
}

export async function gatherTicketInfo(
	interaction: StringSelectMenuInteraction,
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
	interaction: StringSelectMenuInteraction | ButtonInteraction,
	category?: Category,
	strikeId?: string,
) {
	const option =
		interaction.componentType === ComponentType.StringSelect ? interaction.values[0] : category;

	if (option === "sa") {
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
					option === "mod"
						? "Contact User"
						: "Contact Mods - " +
						  {
								appeal: "Appeal a strike",
								report: "Report a user",
								role: "Request a role",
								bug: "Report a Scradd bug",
								update: "Suggest a server change",
								rules: "Get clarification on a rule",
								server: "Add a server to Other Scratch Servers",
								other: "Other",
						  }[option || ""],

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
													strike.count === 0.25
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
		content: option === "mod" ? "" : CONSTANTS.roles.mod?.toString(),
		allowedMentions: { parse: ["roles"] },
	});

	await thread?.members.add(member);

	return thread;
}
