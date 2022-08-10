import { AssertionError } from "assert";
import type { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "@discordjs/builders";
import type { CommandInteraction, Client } from "discord.js";

export type CommandInfo = {
	/** Pass `false` to ignore bad words in this command’s options. Pass `"channel"` to only ignore bad words if the channel allows bad words. */
	censored?: boolean | "channel" = true;
	/**
	 * A builder instance that has constructed the command.
	 *
	 * @throws {AssertionError} An AssertionError is thrown if `.setName` is called on this builder. The file name is used automatically.
	 */
	data: Command;
	/** Pass `true` to make this a global command. This has the side effect of allowing the command to be used in DMs. */
	dm?: boolean = false;
	/** Pass `false` to disable this command. */
	enable?: boolean = true;
	/** A function that processes interactions to this command. */
	interaction: (interaction: CommandInteraction) => Promise<void> | void;
};
type CommandFunction = (this: Client<true>) => CommandInfo | Promise<CommandInfo>;
type CommandFile = CommandFunction | CommandInfo;
export default CommandFile;
export type Command =
	| SlashCommandSubcommandsOnlyBuilder
	| Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
