import type {
	APIEmbed,
	ApplicationCommandSubCommand,
	ChatInputCommandInteraction,
} from "discord.js";
import type { CustomOperation } from "../util.js";

import { ApplicationCommand, ApplicationCommandOptionType, inlineCode } from "discord.js";
import { columnize } from "strife.js";

import constants from "../../../common/constants.js";
import { OPERATION_PREFIX, splitFirstArgument } from "../misc.js";

export const getSchemasFromInteraction = async (
	interaction: ChatInputCommandInteraction,
): Promise<Record<string, ApplicationCommand | CustomOperation>> =>
	await import("../util.js").then(({ default: getSchemas }) =>
		getSchemas(interaction.member ?? interaction.user, interaction.channel ?? undefined),
	);

const data: CustomOperation = {
	name: "help",
	description: "Show this help message",
	options: [
		{
			name: "operation",
			description: "The operation to show help for",
			type: ApplicationCommandOptionType.String,
			required: false,
		},
	],
	permissions: () => true,
	async command(interaction, { operation: rawOperation } = {}) {
		await interaction.deferReply();

		const schemas = await getSchemasFromInteraction(interaction);

		const [operationName, args] =
			typeof rawOperation === "string" ? splitFirstArgument(rawOperation) : [];
		const subcommandName = args && splitFirstArgument(args)[0];
		const operation =
			operationName &&
			((subcommandName &&
				(schemas[operationName]?.options ?? []).find(
					(option): option is ApplicationCommandSubCommand =>
						option.type === ApplicationCommandOptionType.Subcommand &&
						option.name === subcommandName,
				)) ||
				schemas[operationName]);

		await interaction.editReply({
			embeds: [
				operation ?
					getHelpForOperation(operation, schemas, operationName)
				:	listOperations(schemas),
			],
		});
	},
};

export default data;

export function getHelpForOperation(
	operation: ApplicationCommand | ApplicationCommandSubCommand | CustomOperation,
	schemas: Record<string, ApplicationCommand | CustomOperation>,
	operationName = operation.name,
): APIEmbed {
	return {
		color: constants.themeColor,
		title: `\`${OPERATION_PREFIX}${
			!(operation instanceof ApplicationCommand) && "type" in operation ?
				operationName + " "
			:	""
		}${operation.name}\``,
		description: operation.description,
		fields: [...(operation.options ?? [])].map((option) => ({
			name:
				inlineCode(
					"required" in option && option.required === false ?
						`[${option.name}]`
					:	option.name,
				) +
				((
					[
						ApplicationCommandOptionType.Subcommand,
						ApplicationCommandOptionType.SubcommandGroup,
					].includes(option.type)
				) ?
					""
				:	` (${ApplicationCommandOptionType[option.type]
						.toLowerCase()
						.replace(/^mentionable$/, "user or role")})`),
			value: option.description,
			inline: true,
		})),
		footer:
			schemas[operationName] instanceof ApplicationCommand ?
				{ text: "Also available as a slash command" }
			:	undefined,
	};
}

export function listOperations(
	schemas: Record<string, ApplicationCommand | CustomOperation>,
): APIEmbed {
	return {
		color: constants.themeColor,
		title: "Available Operations",
		fields: columnize(
			Object.values(schemas)
				.toSorted(({ name: one }, { name: two }) => one.localeCompare(two))
				.map(
					(schema) =>
						`- ${inlineCode(OPERATION_PREFIX + schema.name)}: ${schema.description}`,
				),
		),
	};
}
