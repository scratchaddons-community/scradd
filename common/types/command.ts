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
	ButtonInteraction,
	ModalSubmitInteraction,
	StringSelectMenuInteraction,
	UserSelectMenuInteraction,
	RoleSelectMenuInteraction,
	MentionableSelectMenuInteraction,
	ChannelSelectMenuInteraction,
} from "discord.js";

export type Option = { description: string; required?: boolean } & (
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
			| { minLength?: number; maxLength?: number; autocomplete?: true; choices?: never }
	  ))
);

type OptionToType<O extends Option> = {
	[ApplicationCommandOptionType.Attachment]: Attachment;
	[ApplicationCommandOptionType.Mentionable]: GuildMember | Role | User;
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
type OptionsToType<O extends { [key: string]: Option }> = {
	[Key in keyof O]: O[Key]["required"] extends true
		? OptionToType<O[Key]>
		: OptionToType<O[Key]> | undefined;
};

export interface BaseCommand {
	buttons?: Record<string, (interaction: ButtonInteraction, id?: string) => any>;
	modals?: Record<string, (interaction: ModalSubmitInteraction, id?: string) => any>;
	stringSelects?: Record<string, (interaction: StringSelectMenuInteraction, id?: string) => any>;
	userSelects?: Record<string, (interaction: UserSelectMenuInteraction, id?: string) => any>;
	roleSelects?: Record<string, (interaction: RoleSelectMenuInteraction, id?: string) => any>;
	mentionableSelects?: Record<
		string,
		(interaction: MentionableSelectMenuInteraction, id?: string) => any
	>;
	channelSelects?: Record<
		string,
		(interaction: ChannelSelectMenuInteraction, id?: string) => any
	>;
}
interface BaseChatInputCommand extends BaseCommand {
	autocomplete?: (interaction: AutocompleteInteraction<"cached" | "raw">) => any;
}
interface BaseChatInputCommandData {
	type?: never;
	/**
	 * Pass `false` to ignore bad words in this command’s options. Pass `"channel"` to only ignore bad words if the channel allows bad
	 * words.
	 *
	 * @default true
	 */
	censored?: "channel" | false;
	description: string;
	restricted?: true;
}

export interface ContextMenuCommand<T extends typeof ApplicationCommandType["Message" | "User"]>
	extends BaseCommand {
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

export interface ChatInputCommand<O extends { [key: string]: Option } = {}> extends BaseChatInputCommand {
	data: { options?: O; subcommands?: never } & BaseChatInputCommandData;

	/** A function that processes interactions to this command. */
	interaction: (
		interaction: ChatInputCommandInteraction<"cached" | "raw">,
		//	 options: OptionsToType<O>,
	) => any;
}

export interface ChatInputSubcommands<O extends { [key: string]: { [key: string]: Option } }>
	extends BaseChatInputCommand {
	data: {
		options?: never;
		subcommands: {
			[key in keyof O]: {
				description: string;
				subcommands?: never;
				options?: O[key]; // TODO: the `?` breaks it
			};
		};
	} & BaseChatInputCommandData;

	/** A function that processes interactions to this command. */
	interaction: (
		interaction: ChatInputCommandInteraction<"cached" | "raw">,
		// 	options: {
		// 		[S in keyof O]: {
		// 			subcommand: S;
		// 			options: OptionsToType<O[S]>;
		// 		};
		// 	}[keyof O],
	) => any;
}

/**
 * @private
 *
 * @todo Make it work lmao.
 */
export interface ChatInputSubcommandGroups<
	O extends { [key: string]: { [key: string]: { [key: string]: Option } } },
	Subcommand extends keyof O,
	SubcommandGroup extends keyof O[Subcommand],
> {
	data: {
		type?: never;
		/**
		 * Pass `false` to ignore bad words in this command’s options. Pass `"channel"` to only ignore bad words if the channel allows bad
		 * words.
		 *
		 * @default true
		 */
		censored?: "channel" | false;
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
		interaction: ChatInputCommandInteraction<"cached" | "raw">,
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
	autocomplete?: (interaction: AutocompleteInteraction<"cached" | "raw">) => any;
}

type Command =
	| ChatInputCommand<{ [key: string]: Option }>
	| ChatInputSubcommands<{ [key: string]: { [key: string]: Option } }>
	| ContextMenuCommand<typeof ApplicationCommandType["Message" | "User"]>
	| undefined;
export default Command;

export function defineCommand<O extends { [key: string]: Option } = {}>(
	command: ChatInputCommand<O>,
): ChatInputCommand<O>;
export function defineCommand<T extends typeof ApplicationCommandType["Message" | "User"]>(
	command: ContextMenuCommand<T>,
): ContextMenuCommand<T>;
export function defineCommand<O extends { [key: string]: { [key: string]: Option } }>(
	command: ChatInputSubcommands<O>,
): ChatInputSubcommands<O>;
// export function defineCommand<
// 	O extends { [key: string]: { [key: string]: { [key: string]: Option } } } = {},
// 	Subcommand extends keyof O = never,
// 	SubcommandGroup extends keyof O[Subcommand] = never,
// >(
// 	command: ChatInputSubcommandGroups<O, Subcommand, SubcommandGroup>,
// ): ChatInputSubcommandGroups<O, Subcommand, SubcommandGroup>;
/** @param command */
export function defineCommand<T extends any>(command: T): T {
	return command;
}
