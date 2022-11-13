import type {
	ChatInputCommandInteraction,
	AutocompleteInteraction,
	ApplicationCommandType,
	ApplicationCommandOptionType,
	ChannelType,
	Attachment,
	GuildBasedChannel,
	GuildMember,
	Role,
	User,
	MessageContextMenuCommandInteraction,
	UserContextMenuCommandInteraction,
} from "discord.js";

export interface ContextMenuCommand<T extends typeof ApplicationCommandType["Message" | "User"]> {
	data: {
		type: T;
		censored?: never;
		description?: never;
		restricted?: true;
		options?: never;
		subcommands?: never;
	};

	/** A function that processes interactions to this command. */
	interaction: (
		interaction: {
			[ApplicationCommandType.Message]: MessageContextMenuCommandInteraction;
			[ApplicationCommandType.User]: UserContextMenuCommandInteraction;
		}[T],
	) => any;
	autocomplete?: never;
}

export type Option = { description: string; required?: boolean } & (
	| {
			type: typeof ApplicationCommandOptionType[
				| "Attachment"
				| "Boolean"
				| "Mentionable"
				| "Role"
				| "User"];
			choices?: never;
			channelTypes?: never;
			min?: never;
			max?: never;
			minLength?: never;
			maxLength?: never;
			autocomplete?: never;
	  }
	| {
			type: ApplicationCommandOptionType.Channel;
			channelTypes?: ChannelType[];
			choices?: never;
			min?: never;
			max?: never;
			minLength?: never;
			maxLength?: never;
			autocomplete?: never;
	  }
	| {
			type: typeof ApplicationCommandOptionType["Integer" | "Number"];
			min?: number;
			max?: number;
			choices?: never;
			channelTypes?: never;
			minLength?: never;
			maxLength?: never;
			autocomplete?: never;
	  }
	| ({
			type: ApplicationCommandOptionType.String;
			channelTypes?: never;
			min?: never;
			max?: never;
	  } & (
			| { minLength?: number; maxLength?: number; autocomplete?: true; choices?: never }
			| {
					choices?: Record<string, string>;
					minLength?: never;
					maxLength?: never;
					autocomplete?: never;
			  }
	  ))
);

type OptionToType<O extends Option> = {
	[ApplicationCommandOptionType.Attachment]: Attachment;
	[ApplicationCommandOptionType.Mentionable]: User | GuildMember | Role;
	[ApplicationCommandOptionType.Role]: Role;
	[ApplicationCommandOptionType.Boolean]: boolean;
	[ApplicationCommandOptionType.User]: User;
	[ApplicationCommandOptionType.Channel]: GuildBasedChannel;
	[ApplicationCommandOptionType.Integer]: number;
	[ApplicationCommandOptionType.Number]: number;
	[ApplicationCommandOptionType.String]: Extract<keyof O["choices"], string> extends never
		? string
		: Extract<keyof O["choices"], string>;
}[O["type"]];
type OptionsToType<O extends Record<string, Option>> = {
	[Key in keyof O]: O[Key]["required"] extends true
		? OptionToType<O[Key]>
		: OptionToType<O[Key]> | undefined;
};

export interface ChatInputCommand<O extends Record<string, Option> = {}> {
	data: {
		type?: never;
		/**
		 * Pass `false` to ignore bad words in this command’s options. Pass `"channel"` to only ignore bad words if the channel allows bad words.
		 *
		 * @default true
		 */
		censored?: false | "channel";
		description: string;
		restricted?: true;
		options?: O;
		subcommands?: never;
	};

	/** A function that processes interactions to this command. */
	interaction: (
		interaction: ChatInputCommandInteraction<"raw" | "cached">,
		// options: OptionsToType<O>,
	) => any;
	autocomplete?: (interaction: AutocompleteInteraction<"raw" | "cached">) => any;
}

export interface ChatInputSubcommands<O extends Record<string, Record<string, Option>>> {
	data: {
		type?: never;
		/**
		 * Pass `false` to ignore bad words in this command’s options. Pass `"channel"` to only ignore bad words if the channel allows bad words.
		 *
		 * @default true
		 */
		censored?: false | "channel";
		description: string;
		restricted?: true;

		options?: never;
		subcommands: {
			[key in keyof O]: {
				description: string;
				subcommands?: never;
				options?: O[key]; // TODO: the `?` breaks it
			};
		};
	};

	/** A function that processes interactions to this command. */
	interaction: (
		interaction: ChatInputCommandInteraction<"raw" | "cached">,
		// options: {
		// 	[S in keyof O]: {
		// 		subcommand: S;
		// 		options: OptionsToType<O[S]>;
		// 	};
		// }[keyof O],
	) => any;
	autocomplete?: (interaction: AutocompleteInteraction<"raw" | "cached">) => any;
}

export interface ChatInputSubcommandGroups<
	O extends Record<string, Record<string, Record<string, Option>>>,
	Subcommand extends keyof O,
	SubcommandGroup extends keyof O[Subcommand],
> {
	data: {
		type?: never;
		/**
		 * Pass `false` to ignore bad words in this command’s options. Pass `"channel"` to only ignore bad words if the channel allows bad words.
		 *
		 * @default true
		 */
		censored?: false | "channel";
		description: string;
		restricted?: true;
		options?: never;
		subcommands?: {
			[key in keyof O]: {
				description: string;
				options?: never;
				subcommands?: {
					[subkey in keyof O[key]]: {
						description: string;
						options?: O[key][subkey];
						subcommands?: never;
					};
				};
			};
		};
	};

	/** A function that processes interactions to this command. */
	interaction: (
		interaction: ChatInputCommandInteraction<"raw" | "cached">,
		options: {
			[SG in SubcommandGroup]: {
				[S in Subcommand]: {
					options: OptionsToType<any>;
					subcommand: S;
					subcommandGroup: SG;
				};
			}[Subcommand];
		}[SubcommandGroup],
	) => any;
	autocomplete?: (interaction: AutocompleteInteraction<"raw" | "cached">) => any;
}

type Command =
	| ContextMenuCommand<typeof ApplicationCommandType["Message" | "User"]>
	| ChatInputCommand<Record<string, Option>>
	| ChatInputSubcommands<Record<string, Record<string, Option>>>
	| undefined;
export default Command;

export function defineCommand<O extends Record<string, Option> = {}>(
	command: ChatInputCommand<O>,
): ChatInputCommand<O>;
export function defineCommand<T extends typeof ApplicationCommandType["Message" | "User"]>(
	command: ContextMenuCommand<T>,
): ContextMenuCommand<T>;
export function defineCommand<O extends Record<string, Record<string, Option>>>(
	command: ChatInputSubcommands<O>,
): ChatInputSubcommands<O>;
export function defineCommand<
	O extends Record<string, Record<string, Record<string, Option>>> = {},
	Subcommand extends keyof O = never,
	SubcommandGroup extends keyof O[Subcommand] = never,
>(
	command: ChatInputSubcommandGroups<O, Subcommand, SubcommandGroup>,
): ChatInputSubcommandGroups<O, Subcommand, SubcommandGroup>
export function defineCommand<T extends any>(
	command: T,
): T {
	return command;
};
