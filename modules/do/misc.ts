import {
	ApplicationCommandOptionType,
	type ApplicationCommandOption,
	type ApplicationCommandSubCommand,
	MessageMentions,
	type Role,
	type User,
	type GuildBasedChannel,
	Base,
} from "discord.js";
import config from "../../common/config.js";
import { client } from "strife.js";

export const OPERATION_PREFIX = "~ ";
const operationPrefixRegex = new RegExp(
	`^${OPERATION_PREFIX.trim().replaceAll(/[$()*+.?[\\\]^{|}]/g, "\\$&")}\\s*`,
);

export function splitFirstArgument(argumentString: string) {
	const [commandName, args = ""] = argumentString
		.replace(operationPrefixRegex, "")
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
export function schemaSupported(options: ApplicationCommandOption[]) {
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
): Promise<Options | boolean | { subcommand: string; options: Options }>;
export async function parseArguments(
	argumentString: string,
	schema: readonly ApplicationCommandOption[],
	allowSubcommands: false,
): Promise<Options | boolean>;
export async function parseArguments(
	argumentString: string,
	schema: readonly ApplicationCommandOption[],
	allowSubcommands = true,
): Promise<Options | boolean | { subcommand: string; options: Options }> {
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
		if (typeof parsed === "boolean") return parsed;

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
	const required = "required" in schema ? schema.required ?? true : true;

	if (argument) {
		// TODO: check other option restrictions
		switch (schema.type) {
			case ApplicationCommandOptionType.String: {
				return argument;
			}
			case ApplicationCommandOptionType.Boolean: {
				const option = { true: true, false: false }[argument];
				if (option !== undefined) return option;
				break;
			}
			case ApplicationCommandOptionType.Integer:
			case ApplicationCommandOptionType.Number: {
				const parsed =
					Number[
						schema.type === ApplicationCommandOptionType.Integer
							? "parseInt"
							: "parseFloat"
					](argument);

				if (!Number.isNaN(parsed)) return parsed;
				break;
			}
			case ApplicationCommandOptionType.Channel: {
				const parsed =
					MessageMentions.ChannelsPattern.exec(argument)?.groups?.id || argument;
				const fetched = parsed && (await client.channels.fetch(parsed).catch(() => void 0));

				if (fetched && !fetched.isDMBased()) return fetched;
				break;
			}
			case ApplicationCommandOptionType.User:
			case ApplicationCommandOptionType.Mentionable: {
				const parsed = MessageMentions.UsersPattern.exec(argument)?.groups?.id || argument;
				const fetched = parsed && (await client.users.fetch(parsed).catch(() => void 0));

				if (fetched) return fetched;
				if (schema.type === ApplicationCommandOptionType.User) break; // Mentionable falls through
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

	return UNSUPPORTED_OPTIONS.includes(schema.type)
		? { error: true }
		: required
		? { error: false }
		: undefined;
}

export function partitionArguments(
	argumentString: string,
	schema: readonly ApplicationCommandOption[],
) {
	const words = argumentString.split(/\s+/g);
	const whitespace = argumentString.split(/\S+/g);

	const stringIndex = schema.findIndex(
		(option) => option.type === ApplicationCommandOptionType.String,
	);
	const stringEnd = words.length - schema.length + stringIndex + 1;

	return stringIndex > -1
		? [
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
		: words;
}
