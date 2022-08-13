import { AssertionError } from "assert";
import type {
	SlashCommandBuilder,
	SlashCommandSubcommandsOnlyBuilder,
	ChatInputCommandInteraction,
	Client,
	Guild,
	Snowflake,
	APIInteractionGuildMember,
	GuildMember,
	PermissionsBitField,
	Locale,
	ApplicationCommand,
	GuildResolvable,
	Awaitable,
} from "discord.js";

type CommandInfo = {
	/** Pass `false` to ignore bad words in this command’s options. Pass `"channel"` to only ignore bad words if the channel allows bad words. */
	censored?: boolean | "channel" = true;
	/**
	 * A builder instance that has constructed the command.
	 *
	 * @throws {AssertionError} If {@link Command.setName} is called on this builder. The file name is used automatically.
	 * @throws {AssertionError} If {@link Command.setDMPermission} is called on this builder. Use {@link CommandInfo.dm} to set the
	 *   availability of this command in DMs.
	 */
	data: ((this: Client<true>) => Awaitable<Command>) | Command;
	/** Pass `false` to disable this command. */
	enable?: boolean = true;
} & (
	| {
			/** Pass `true` to make this a global command. This has the side effect of allowing the command to be used in DMs. */
			dm: true;
			/** A function that processes interactions to this command. */
			interaction: (interaction: ChatInputCommandInteraction<undefined>) => Awaitable<void>;
	  }
	| {
			/** Pass `true` to make this a global command. This has the side effect of allowing the command to be used in DMs. */
			dm?: false;
			/** A function that processes interactions to this command. */
			interaction: (
				interaction: ChatInputCommandInteraction<"raw" | "cached"> & {
					guild: Guild;
					guildId: Snowflake;
					member: APIInteractionGuildMember | GuildMember;
					memberPermissions: PermissionsBitField;
					guildLocale: Locale;
					commandGuildId: Snowflake;
					get command(): ApplicationCommand<{ guild: GuildResolvable }> | null;
				},
			) => Awaitable<void>;
	  }
);
export default CommandInfo;
export type Command =
	| SlashCommandSubcommandsOnlyBuilder
	| Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
