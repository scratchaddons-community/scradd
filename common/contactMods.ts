import {
	APIEmbedField,
	ButtonStyle,
	ChannelType,
	ChatInputCommandInteraction,
	ComponentType,
	GuildMember,
	InteractionReplyOptions,
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
import { strikeDatabase } from "./punishments.js";

const CATEGORIES = ["appeal", "report", "role", "bug", "update", "rules", "other"] as const;
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
			label: "What are your GitHub and Transifex usernames?",
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
} satisfies Record<string, TextInputComponentData[]>;

export const ticketCategoryMessage = {
	content: `👋 Thanks for reaching out!`,
	components: [
		{
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.StringSelect,
					customId: "_contactMods",
					options: [
						...([
							{ label: "Appeal a warn", value: "appeal" },
							{ label: "Report a user", value: "report" },
							{ label: "Request a role", value: "role" },
							{ label: "Report a Scradd bug", value: "bug" },
							{
								label: "Suggest a server change",
								value: "update",
							},
							{
								label: "Get clarification on a rule",
								value: "rules",
							},
							{
								label: "Get help with Scratch Addons",
								value: "sa",
							},
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
 * Given a modmail ticket thread, return the user who messages are being sent to.
 *
 * @param thread - Ticket ticket thread.
 *
 * @returns User who messages are being sent to.
 */
export async function getUserFromTicket(thread: ThreadChannel): Promise<void | User> {
	const messages = await thread.messages.fetch({ after: thread.id, limit: 2 });
	return messages.first()?.mentions.users.first();
}

/**
 * Given a user, find a ticket thread that sends messages to them.
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

/** @param interaction */
export async function gatherTicketInfo(interaction: StringSelectMenuInteraction) {
	const [option] = interaction.values;

	if (option === "sa") {
		return await interaction.reply({
			content: `${
				CONSTANTS.emojis.statuses.no
			} Please don't contact mods for SA help. Instead, put your suggestions in ${CONSTANTS.channels.suggestions?.toString()}, bug reports in ${CONSTANTS.channels.bugs?.toString()}, and other questions, comments, concerns, or etcetera in ${CONSTANTS.channels.support?.toString()}.`,

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

	if (!CATEGORIES.includes(option)) throw new TypeError(`Unknown ticket category: ${option}`);

	const fields = allFields[option];

	if (!fields) throw new ReferenceError(`Unknown ticket category: ${option}`);

	await interaction.showModal({
		title: `Contact Mods - ${categoryToDescription[option]}`,

		customId: `${option}_contactMods`,

		components: fields.map((field) => ({
			type: ComponentType.ActionRow,
			components: [field],
		})),
	});
}

export default async function startTicket(
	interaction: ModalSubmitInteraction | ChatInputCommandInteraction<"cached" | "raw">,
	options: string | GuildMember,
) {
	const option = options instanceof GuildMember ? "mod" : options;
	if (!CATEGORIES.includes(option) && option !== "mod")
		throw new TypeError(`Unknown ticket category: ${option}`);

	const member = options instanceof GuildMember ? options : interaction.member;
	if (!(member instanceof GuildMember)) throw new TypeError("member is not a GuildMember!");

	const fields =
		interaction.type === InteractionType.ApplicationCommand
			? []
			: Object.entries(
					{
						appeal: { "Strike ID": "strike" },
						report: { "Reported User": "user" },
						role: { "Role(s)": "role", "Account(s)": "account" },
						bug: {},
						update: {},
						rules: { Rule: "rule" },
						other: {},
						mod: {},
					}[option],
			  ).map<APIEmbedField>(([name, key]) => ({
					name,
					value: interaction.fields.getTextInputValue(key),
					inline: true,
			  }));
	if (option !== "role" && interaction.type !== InteractionType.ApplicationCommand)
		fields.push({
			name: CONSTANTS.zeroWidthSpace,
			value: interaction.fields.getTextInputValue("BODY"),
			inline: false,
		});

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
	await thread?.setLocked(true, "Ticket opened");

	const strikes = strikeDatabase.data
		.filter((strike: { user: string }) => strike.user === member.id)
		.sort((one: { date: number }, two: { date: number }) => two.date - one.date);

	const totalStrikeCount = Math.trunc(
		strikes.reduce(
			(accumulator: number, { count, removed }: any) =>
				count * Number(!removed) + accumulator,
			0,
		),
	);

	const numberOfPages = Math.ceil(strikes.length / 15);

	const filtered = strikes.filter((_: any, index: number) => index < 15);

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

											options: filtered.map((strike: { id: any }) => ({
												label: String(strike.id),
												value: String(strike.id),
											})),
										},
								  ]
								: filtered.map((strike: { id: any }) => ({
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
								appeal: "Appeal a warn",
								report: "Report a user",
								role: "Request a role",
								bug: "Report a Scradd bug",
								update: "Suggest a server change",
								rules: "Get clarification on a rule",
								other: "Other",
						  }[option || ""],

				color: member.displayColor,

				author: {
					icon_url: member.displayAvatarURL(),
					name: member.displayName,
				},
				fields,
			},
			{
				title: `${member.displayName}’s strikes`,
				description: filtered.length
					? filtered
							.map(
								(strike: {
									removed: any;
									id: any;
									count: number;
									date: string | number | Date;
								}) =>
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
	});

	await thread?.members.add(member);

	return thread;
}
