import {
	ComponentType,
	TextInputStyle,
	type TextInputComponentData,
	type Snowflake,
	ChannelType,
	type ThreadChannel,
	type PrivateThreadChannel,
} from "discord.js";
import config, { getInitialChannelThreads } from "../../common/config.js";

export const TICKETS_BY_MEMBER = Object.fromEntries<
	PrivateThreadChannel | ThreadChannel | undefined
>(
	config.channels.tickets
		? getInitialChannelThreads(config.channels.tickets)
				.map(
					(thread) =>
						thread.type === ChannelType.PrivateThread &&
						([getIdFromName(thread.name) ?? "", thread] as const),
				)
				.filter(Boolean)
		: [],
);

export const TICKET_CATEGORIES = [
	"appeal",
	"report",
	"role",
	"bug",
	"rules",
	"server",
	"other",
] as const;
export type Category = typeof TICKET_CATEGORIES[number];
export const SA_CATEGORY = "sa";
export const SERVER_CATEGORY = "update";
export const MOD_CATEGORY = "mod";

export const allFields = {
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

export const categoryToDescription = {
	appeal: "Strike Appeal",
	report: "User Report",
	role: "Role Request",
	bug: "Scradd Bug",
	rules: "Rule Clarification",
	server: "Other Scratch Servers",
	other: "Other",
	[MOD_CATEGORY]: "Contact User",
} satisfies Record<Category | typeof MOD_CATEGORY, string>;

export function getIdFromName(name: string): Snowflake | undefined {
	return /\((\d+)\)$/.exec(name)?.[1];
}
