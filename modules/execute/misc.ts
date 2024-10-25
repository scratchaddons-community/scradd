import {
	ApplicationCommandOptionType,
	Base,
	MessageMentions,
	type ApplicationCommandOption,
	type ApplicationCommandSubCommand,
	type GuildBasedChannel,
	type Role,
	type User,
} from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";

export const OPERATION_PREFIX = "~ ";
const operationPrefixRegexp = new RegExp(
	`^${OPERATION_PREFIX.trim().replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`)}\\s*`,
);

export function splitFirstArgument(argumentString: string): readonly [Lowercase<string>, string] {
	const [commandName, args = ""] = argumentString
		.replace(operationPrefixRegexp, "")
		.split(/(?<=^\S+)\s+/);
	return [commandName.toLowerCase(), args] as const;
}

export type Options = Record<
	string,
	GuildBasedChannel | Role | User | boolean | number | string | undefined
>;

export const UNSUPPORTED_OPTIONS = [
	ApplicationCommandOptionType.Attachment,
	ApplicationCommandOptionType.Subcommand,
	ApplicationCommandOptionType.SubcommandGroup,
] as const;
export function schemaSupported(options: ApplicationCommandOption[]): boolean {
	const isSubcommands =
		options.length &&
		options.every(
			(option): option is ApplicationCommandSubCommand =>
				option.type === ApplicationCommandOptionType.Subcommand,
		);
	if (!isSubcommands)
		return options.every((suboption) => !UNSUPPORTED_OPTIONS.includes(suboption.type));

	return options.some(
		(option) =>
			!option.options?.length ||
			!option.options.some((suboption) => UNSUPPORTED_OPTIONS.includes(suboption.type)),
	);
}

/** @returns The parsed options, true for unsupported schema, or false for invalid options passed. */
export async function parseArguments(
	argumentString: string,
	schema: readonly ApplicationCommandOption[],
	allowSubcommands?: true,
): Promise<Options | boolean | { subcommand: string; options: Options | boolean }>;
export async function parseArguments(
	argumentString: string,
	schema: readonly ApplicationCommandOption[],
	allowSubcommands: false,
): Promise<Options | boolean>;
export async function parseArguments(
	argumentString: string,
	schema: readonly ApplicationCommandOption[],
	allowSubcommands = true,
): Promise<Options | boolean | { subcommand: string; options: Options | boolean }> {
	const hasSubcommands =
		schema.length &&
		schema.every(
			(found): found is ApplicationCommandSubCommand =>
				found.type === ApplicationCommandOptionType.Subcommand,
		); // todo: implement subgroups
	if (hasSubcommands) {
		if (!allowSubcommands) return true;

		const [subcommand, args] = splitFirstArgument(argumentString);
		const subSchema = schema.find((found) => found.name === subcommand);
		if (!subSchema) return false;

		const parsed = await parseArguments(args, subSchema.options ?? [], false);
		return { subcommand: subSchema.name, options: parsed };
	}

	const filteredSchema = schema.filter(
		(option) => option.type !== ApplicationCommandOptionType.Attachment || !option.required,
	);

	const partitioned = partitionArguments(argumentString, filteredSchema);

	const options: Options = {};
	for (const [index, option] of filteredSchema.entries()) {
		const value = await parseArgument(partitioned[index], option);
		if (typeof value === "object" && !(value instanceof Base)) return value.error;
		options[option.name] = value;
	}
	return options;
}

export async function parseArgument(
	argument: string | undefined,
	schema: ApplicationCommandOption,
): Promise<Options[string] | { error: boolean }> {
	if (schema.name === "option") return { error: true };

	const required = "required" in schema ? schema.required ?? true : true;

	if (argument) {
		switch (schema.type) {
			case ApplicationCommandOptionType.String: {
				if (
					argument.length > (schema.maxLength ?? argument.length) ||
					argument.length < (schema.minLength ?? argument.length)
				)
					break;
				if (
					"choices" in schema &&
					schema.choices &&
					!schema.choices.some((choice) => choice.value === argument)
				)
					break;
				return argument;
			}
			case ApplicationCommandOptionType.Boolean: {
				const option = { true: true, false: false }[argument];
				if (option === undefined) break;
				return option;
			}
			case ApplicationCommandOptionType.Integer:
			case ApplicationCommandOptionType.Number: {
				const parsed =
					Number[
						schema.type === ApplicationCommandOptionType.Integer ?
							"parseInt"
						:	"parseFloat"
					](argument);

				if (
					Number.isNaN(parsed) ||
					parsed > (schema.maxValue ?? parsed) ||
					parsed < (schema.minValue ?? parsed)
				)
					break;
				if (
					"choices" in schema &&
					schema.choices &&
					!schema.choices.some((choice) => choice.value === parsed)
				)
					break;
				return parsed;
			}
			case ApplicationCommandOptionType.Channel: {
				const parsed =
					MessageMentions.ChannelsPattern.exec(argument)?.groups?.id || argument;
				const fetched = parsed && (await client.channels.fetch(parsed).catch(() => void 0));

				if (
					!fetched ||
					fetched.isDMBased() ||
					(schema.channelTypes && !schema.channelTypes.includes(fetched.type))
				)
					break;
				return fetched;
			}
			case ApplicationCommandOptionType.User:
			case ApplicationCommandOptionType.Mentionable: {
				const parsed = MessageMentions.UsersPattern.exec(argument)?.groups?.id || argument;
				const fetched = parsed && (await client.users.fetch(parsed).catch(() => void 0));

				if (fetched) return fetched;
				if (schema.type === ApplicationCommandOptionType.User) break;
				// Mentionable falls through
			}
			case ApplicationCommandOptionType.Role: {
				const parsed = MessageMentions.RolesPattern.exec(argument)?.groups?.id || argument;
				const fetched =
					parsed && (await config.guild.roles.fetch(parsed).catch(() => void 0));

				if (fetched) return fetched;
				break;
			}
			case ApplicationCommandOptionType.Subcommand:
			case ApplicationCommandOptionType.SubcommandGroup:
			case ApplicationCommandOptionType.Attachment: {
				break;
			}
		}
	}

	return (
		UNSUPPORTED_OPTIONS.includes(schema.type) ? { error: true }
		: required ? { error: false }
		: undefined
	);
}

export function partitionArguments(
	argumentString: string,
	schema: readonly ApplicationCommandOption[],
): string[] {
	const words = argumentString.split(/\s+/g);
	const whitespace = argumentString.split(/\S+/g);

	const stringIndex = schema.findIndex(
		(option) => option.type === ApplicationCommandOptionType.String,
	);
	const stringEnd = words.length - schema.length + stringIndex + 1;

	return stringIndex !== -1 ?
			[
				...words.slice(0, stringIndex),
				words
					.slice(stringIndex, stringEnd)
					.reduce(
						(accumulator, part, index, { length }) =>
							`${accumulator}${part}` +
							(index + 1 === length ? "" : whitespace[index + stringIndex + 1]),
						"",
					),
				...words.slice(stringEnd),
			]
		:	words;
}
