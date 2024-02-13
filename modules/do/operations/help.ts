import {
	ApplicationCommand,
	ApplicationCommandOptionType,
	inlineCode,
	lazy,
	type ApplicationCommandSubCommand,
} from "discord.js";
import type { CustomOperation } from "../util.js";
import { OPERATION_PREFIX, splitFirstArgument } from "../misc.js";
import constants from "../../../common/constants.js";

const getSchemas = lazy(async () => (await import("../util.js")).default);

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
	async command(interaction, { operation: rawOperation } = {}) {
		await interaction.deferReply();

		const schemas = await (
			await getSchemas()
		)(
			interaction.inCachedGuild()
				? interaction.member
				: interaction.inRawGuild()
				? { ...interaction.member, id: interaction.user.id }
				: interaction.user,
			interaction.channel || undefined,
		);

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
				operation
					? {
							color: constants.themeColor,
							title: `\`${OPERATION_PREFIX}${
								!(operation instanceof ApplicationCommand) && "type" in operation
									? operationName + " "
									: ""
							}${operation.name}\``,
							description: operation.description,
							fields: [...(operation.options ?? [])].map((option) => ({
								name:
									inlineCode(
										"required" in option && option.required === false
											? `[${option.name}]`
											: option.name,
									) +
									([
										ApplicationCommandOptionType.Subcommand,
										ApplicationCommandOptionType.SubcommandGroup,
									].includes(option.type)
										? ""
										: ` (${ApplicationCommandOptionType[option.type]
												.toLowerCase()
												.replace(/^mentionable$/, "user or role")})`),
								value: option.description,
								inline: true,
							})),
							footer:
								schemas[operationName] instanceof ApplicationCommand
									? { text: "Also available as a slash command" }
									: undefined,
					  }
					: {
							color: constants.themeColor,
							title: "Available Operations",
							description: Object.values(schemas)
								.sort(({ name: one }, { name: two }) => one.localeCompare(two))
								.map(
									(schema) =>
										inlineCode(OPERATION_PREFIX + schema.name) +
										": " +
										schema.description,
								)
								.join("\n"),
					  },
			],
		});
	},
};

export default data;
