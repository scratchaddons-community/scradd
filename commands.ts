import {
	ApplicationCommandType,
	PermissionsBitField,
	ApplicationCommandOptionType,
	type ApplicationCommandAutocompleteNumericOptionData,
	type ApplicationCommandAutocompleteStringOptionData,
	type ApplicationCommandChannelOptionData,
	type ApplicationCommandNonOptionsData,
	type ApplicationCommandNumericOptionData,
	type ApplicationCommandStringOptionData,
	ApplicationCommandData,
	ChatInputCommandInteraction,
	ChannelType,
	MessageContextMenuCommandInteraction,
	UserContextMenuCommandInteraction,
	AutocompleteInteraction,
} from "discord.js";
export const commandData: ApplicationCommandData[] = [];
export const commands = new Map<string, Command>();

type Option = { description: string; required?: boolean } & (
	| {
			type: ApplicationCommandOptionType.Channel;
			channelTypes?: ChannelType[];
			choices?: never;
			minValue?: never;
			maxValue?: never;
			minLength?: never;
			maxLength?: never;
			autocomplete?: never;
	  }
	| {
			type: typeof ApplicationCommandOptionType[
				| "Attachment"
				| "Boolean"
				| "Mentionable"
				| "Role"
				| "User"];
			choices?: never;
			channelTypes?: never;
			minValue?: never;
			maxValue?: never;
			minLength?: never;
			maxLength?: never;
			autocomplete?: never;
	  }
	| {
			type: typeof ApplicationCommandOptionType["Integer" | "Number"];
			minValue?: number;
			maxValue?: number;
			choices?: never;
			channelTypes?: never;
			minLength?: never;
			maxLength?: never;
			autocomplete?: never;
	  }
	| ({
			type: ApplicationCommandOptionType.String;
			channelTypes?: never;
			minValue?: never;
			maxValue?: never;
	  } & (
			| {
					choices?: { [key: string]: string };
					minLength?: never;
					maxLength?: never;
					autocomplete?: never;
			  }
			| {
					minLength?: number;
					maxLength?: number;
					autocomplete?: (interaction: AutocompleteInteraction<"cached" | "raw">) => any;
					choices?: never;
			  }
	  ))
);
interface BaseCommandData {
	name: string;
	restricted?: true;
}
interface BaseChatInputCommandData extends BaseCommandData {
	description: string;
	type?: never;
	/**
	 * Pass `false` to ignore bad words in this command’s options. Pass `"channel"` to only ignore bad words if the channel allows bad
	 * words.
	 *
	 * @default true
	 */
	censored?: "channel" | false;
}
interface ChatInputCommandData extends BaseChatInputCommandData {
	options?: { [key: string]: Option };
	subcommands?: never;
}
interface ChatInputSubcommandData<O extends { [key: string]: { [key: string]: Option } }>
	extends BaseChatInputCommandData {
	options?: never;
	subcommands: {
		[key in keyof O]: {
			description: string;
			subcommands?: never;
			options?: O[key]; // TODO: the `?` breaks it
		};
	};
}
interface ContextMenuCommandData<T extends typeof ApplicationCommandType["Message" | "User"]>
	extends BaseCommandData {
	description?: never;
	type: T;
	censored?: never;
	options?: never;
	subcommands?: never;
}

type CommandData =
	| ChatInputCommandData
	| ChatInputSubcommandData<{ [key: string]: { [key: string]: Option } }>
	| ContextMenuCommandData<typeof ApplicationCommandType["Message" | "User"]>;
type Command =
	| ((interaction: ChatInputCommandInteraction<"cached" | "raw">) => any)
	| ((interaction: MessageContextMenuCommandInteraction) => any)
	| ((interaction: UserContextMenuCommandInteraction) => any);

// type OptionToType<O extends Option> = {
// 	[ApplicationCommandOptionType.Attachment]: Attachment;
// 	[ApplicationCommandOptionType.Mentionable]: GuildMember | Role | User;
// 	[ApplicationCommandOptionType.Role]: Role;
// 	[ApplicationCommandOptionType.Boolean]: boolean;
// 	[ApplicationCommandOptionType.User]: User;
// 	[ApplicationCommandOptionType.Channel]: GuildBasedChannel;
// 	[ApplicationCommandOptionType.Integer]: number;
// 	[ApplicationCommandOptionType.Number]: number;
// 	[ApplicationCommandOptionType.String]: Extract<keyof O["choices"], string> extends never
// 		? string
// 		: Extract<keyof O["choices"], string>;
// }[O["type"]];
// type OptionsToType<O extends { [key: string]: Option }> = {
// 	[Key in keyof O]: O[Key]["required"] extends true
// 		? OptionToType<O[Key]>
// 		: OptionToType<O[Key]> | undefined;
// };

export default function defineCommand<O extends { [key: string]: Option } = {}>(
	data: ChatInputCommandData,
	command: (
		interaction: ChatInputCommandInteraction<"cached" | "raw">,
		//  options: OptionsToType<O>,
	) => any,
): void;
export default function defineCommand<O extends { [key: string]: { [key: string]: Option } }>(
	data: ChatInputSubcommandData<O>,
	command: (
		interaction: ChatInputCommandInteraction<"cached" | "raw">,
		// options: {
		// 	[S in keyof O]: {
		// 		subcommand: S;
		// 		options: OptionsToType<O[S]>;
		// 	};
		// }[keyof O],
	) => any,
): void;
export default function defineCommand<T extends typeof ApplicationCommandType["Message" | "User"]>(
	data: ContextMenuCommandData<T>,
	command: (
		interaction: {
			[ApplicationCommandType.Message]: MessageContextMenuCommandInteraction;
			[ApplicationCommandType.User]: UserContextMenuCommandInteraction;
		}[T],
	) => any,
): void;
// export default function defineCommand<
// 	O extends { [key: string]: { [key: string]: { [key: string]: Option } } } = {},
// 	Subcommand extends keyof O = never,
// 	SubcommandGroup extends keyof O[Subcommand] = never,
// >(
// 	command: ChatInputSubcommandGroups<O, Subcommand, SubcommandGroup>,
// ): ChatInputSubcommandGroups<O, Subcommand, SubcommandGroup>;
export default function defineCommand(data: CommandData, command: Command) {
	const type = data.type ?? ApplicationCommandType.ChatInput;

	commandData.push({
		name: data.name,
		description: data.description ?? "",
		type,
		defaultMemberPermissions: data.restricted ? new PermissionsBitField() : null,

		options: data.options
			? transformOptions(data.options)
			: data.subcommands &&
			  Object.entries(data.subcommands).map(([subcommand, command]) => ({
					description: command.description,
					name: subcommand,

					options: command.options && transformOptions(command.options),

					type: ApplicationCommandOptionType.Subcommand,
			  })),
	});

	commands.set(data.name, command);
}

/**
 * Convert our custom options format to something the Discord API will accept.
 *
 * @param options - The options to convert.
 *
 * @returns The converted options.
 */
function transformOptions(options: { [key: string]: Option }) {
	return Object.entries(options)
		.map(([name, option]) => {
			const transformed = {
				name,
				description: option.description,
				type: option.type,
				required: option.required ?? false,
			} as any;

			if (option.autocomplete) transformed.autocomplete = true;
			if (option.choices)
				transformed.choices = Object.entries(option.choices).map(([value, choice]) => ({
					name: choice,
					value,
				}));

			if (option.channelTypes) transformed.channelTypes = option.channelTypes;
			if (option.maxLength !== undefined) transformed.maxLength = option.maxLength;
			if (option.minLength !== undefined) transformed.minLength = option.minLength;

			if (option.maxValue !== undefined) transformed.maxValue = option.maxValue;
			if (option.minValue !== undefined) transformed.minValue = option.minValue;

			return transformed as
				| ApplicationCommandAutocompleteNumericOptionData
				| ApplicationCommandAutocompleteStringOptionData
				| ApplicationCommandChannelOptionData
				| ApplicationCommandNonOptionsData
				| ApplicationCommandNumericOptionData
				| ApplicationCommandStringOptionData;
		})
		.sort((one, two) =>
			one.required === two.required
				? two.name.localeCompare(one.name)
				: one.required
				? -1
				: 1,
		);
}
